import { randomUUID } from 'crypto';
import { ApiError } from '../http';
import { gamesdropProvider } from '../providers/gamesdrop';
import { reloadlyProvider } from '../providers/reloadly';
import { supabaseAdmin } from '../supabaseAdmin';

export type CanonicalOrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'failed';
export type PaymentProvider = 'paymob' | 'fawry';

const computePackagePrice = (pkg: {
  price: number;
  discount_active?: boolean | null;
  discount_type?: 'percent' | 'fixed' | null;
  discount_value?: number | null;
  discount_ends_at?: string | null;
}) => {
  const base = Number(pkg.price || 0);
  const discountActive = Boolean(pkg.discount_active) && Number(pkg.discount_value || 0) > 0;
  const validWindow = !pkg.discount_ends_at || new Date(pkg.discount_ends_at).getTime() > Date.now();

  if (!discountActive || !validWindow) return base;

  const discountValue = Number(pkg.discount_value || 0);
  if (pkg.discount_type === 'percent') {
    return Math.max(0, base - base * (discountValue / 100));
  }

  return Math.max(0, base - discountValue);
};

const safeSelectGame = async (identifier: string) => {
  const normalized = String(identifier || '').trim();
  if (!normalized) return null;

  const base = supabaseAdmin
    .from('games')
    .select('*')
    .or(`id.eq.${normalized},slug.eq.${normalized}`)
    .limit(1)
    .maybeSingle();

  const { data, error } = await base;

  if (!error) return data;

  if (String(error.code || '') === '42703') {
    const fallback = await supabaseAdmin.from('games').select('*').eq('id', normalized).limit(1).maybeSingle();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  throw error;
};

const upsertPaymentRecord = async (payload: {
  orderId: string;
  provider: PaymentProvider;
  transactionId?: string | null;
  status: string;
}) => {
  const { error } = await supabaseAdmin.from('payments').insert({
    id: randomUUID(),
    order_id: payload.orderId,
    provider: payload.provider,
    transaction_id: payload.transactionId || null,
    status: payload.status,
  });

  if (error) {
    if (error.code === '42P01' || error.code === '42703' || error.code === '23503') {
      return;
    }
    throw error;
  }
};

export const ordersService = {
  async listGames() {
    const { data, error } = await supabaseAdmin.from('games').select('*').order('name', { ascending: true });
    if (error) throw new ApiError(500, error.message, 'GAMES_FETCH_FAILED');
    return data || [];
  },

  async getGameByIdentifier(identifier: string) {
    const game = await safeSelectGame(identifier);
    if (!game) throw new ApiError(404, 'Game not found', 'GAME_NOT_FOUND');
    return game;
  },

  async listPackagesForGame(gameIdentifier: string) {
    const game = await this.getGameByIdentifier(gameIdentifier);
    const gameRef = String(game.id);
    const { data, error } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('game_id', gameRef)
      .order('price', { ascending: true });

    if (error) throw new ApiError(500, error.message, 'PACKAGES_FETCH_FAILED');
    return { game, packages: data || [] };
  },

  async createOrder(input: {
    userId: string;
    gameIdentifier: string;
    packageId?: number | null;
    packageName?: string | null;
    playerId: string;
    server?: string | null;
    quantity: number;
    paymentProvider: PaymentProvider;
    legacyAmount?: number;
    paymentDetails?: Record<string, unknown>;
  }) {
    if (!input.userId || !input.gameIdentifier || !input.playerId || Number(input.quantity || 0) <= 0) {
      throw new ApiError(400, 'Invalid order payload', 'INVALID_ORDER_PAYLOAD');
    }

    const game = await this.getGameByIdentifier(input.gameIdentifier);

    let pkg: {
      id: number;
      amount: number;
      price: number;
      discount_active?: boolean | null;
      discount_type?: 'percent' | 'fixed' | null;
      discount_value?: number | null;
      discount_ends_at?: string | null;
    } | null = null;

    if (input.packageId && Number.isFinite(input.packageId)) {
      const row = await supabaseAdmin
        .from('packages')
        .select('id, amount, price, discount_active, discount_type, discount_value, discount_ends_at')
        .eq('id', input.packageId)
        .eq('game_id', String(game.id))
        .maybeSingle();
      if (row.error || !row.data) {
        throw new ApiError(400, 'Package not found', 'PACKAGE_NOT_FOUND');
      }
      pkg = row.data;
    }

    const quantity = Math.max(1, Number(input.quantity || 1));
    const unitPrice = pkg ? computePackagePrice(pkg) : Number(input.legacyAmount || 0);
    const price = Number((unitPrice * quantity).toFixed(2));

    const orderId = randomUUID();
    const packageLabel =
      input.packageName ||
      (pkg ? `${pkg.amount} ${String((game as Record<string, unknown>).currency_name || '').trim()}`.trim() : 'Topup');

    const insertPayload: Record<string, unknown> = {
      id: orderId,
      user_id: input.userId,
      game_id: String(game.id),
      player_id: input.playerId,
      server: input.server || null,
      package: packageLabel,
      price,
      status: 'pending',
      payment_provider: input.paymentProvider,
      payment_method: input.paymentProvider,
      account_identifier: input.playerId,
      payment_details: input.paymentDetails || {},
      quantity,
    };

    if (pkg) {
      insertPayload.package_id = pkg.id;
      insertPayload.amount = pkg.amount * quantity;
    } else {
      insertPayload.amount = Number(input.legacyAmount || 0);
    }

    const { data, error } = await supabaseAdmin.from('orders').insert(insertPayload).select('*').single();

    if (error || !data) {
      throw new ApiError(500, error?.message || 'Failed to create order', 'ORDER_CREATE_FAILED');
    }

    return {
      order: data,
      price,
      providerApi: String((game as Record<string, unknown>).provider_api || 'reloadly').toLowerCase() as 'reloadly' | 'gamesdrop',
    };
  },

  async listUserOrders(userId: string, page = 1, limit = 20) {
    const offset = Math.max(0, (page - 1) * limit);
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(500, error.message, 'ORDERS_FETCH_FAILED');
    return data || [];
  },

  async getOrder(orderId: string) {
    const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (error) throw new ApiError(500, error.message, 'ORDER_FETCH_FAILED');
    if (!data) throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
    return data;
  },

  async setOrderStatus(orderId: string, status: CanonicalOrderStatus, extra?: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status, ...(extra || {}) })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error || !data) {
      throw new ApiError(500, error?.message || 'Failed to update order', 'ORDER_UPDATE_FAILED');
    }

    return data;
  },

  async initiatePayment(params: { orderId: string; provider: PaymentProvider; amount: number }) {
    const { paymobPayment } = await import('../payments/paymob');
    const { fawryPayment } = await import('../payments/fawry');

    const init =
      params.provider === 'fawry'
        ? await fawryPayment.initiate(params.orderId, params.amount)
        : await paymobPayment.initiate(params.orderId, params.amount);

    await upsertPaymentRecord({
      orderId: params.orderId,
      provider: params.provider,
      transactionId: init.paymentReference,
      status: 'initiated',
    });

    return init;
  },

  async verifyAndFulfill(params: { provider: PaymentProvider; payload: Record<string, unknown> }) {
    const { paymobPayment } = await import('../payments/paymob');
    const { fawryPayment } = await import('../payments/fawry');

    const orderId = String(params.payload.order_id || params.payload.orderId || '');
    if (!orderId) {
      throw new ApiError(400, 'order_id is required', 'PAYMENT_VERIFY_BAD_REQUEST');
    }

    const order = await this.getOrder(orderId);
    const valid = params.provider === 'fawry' ? fawryPayment.verify(params.payload) : paymobPayment.verify(params.payload);

    if (!valid) {
      throw new ApiError(400, 'Invalid payment signature', 'PAYMENT_SIGNATURE_INVALID');
    }

    const paymentRef = String(
      params.payload.txn_id || params.payload.transaction_id || params.payload.reference || `${params.provider}-${order.id}`,
    );

    await upsertPaymentRecord({
      orderId,
      provider: params.provider,
      transactionId: paymentRef,
      status: 'paid',
    });

    await this.setOrderStatus(orderId, 'paid', {
      transaction_id: paymentRef,
    });

    const processing = await this.setOrderStatus(orderId, 'processing');

    const game = await this.getGameByIdentifier(String(processing.game_id));
    const providerApi = String((game as Record<string, unknown>).provider_api || 'reloadly').toLowerCase();

    try {
      const result =
        providerApi === 'gamesdrop'
          ? await gamesdropProvider.createTopup({
              orderId: String(processing.id),
              gameId: String(processing.game_id),
              playerId: String(processing.player_id || processing.account_identifier || ''),
              server: (processing.server as string | null) || null,
              packageName: String(processing.package || ''),
              quantity: Number(processing.quantity || 1),
            })
          : await reloadlyProvider.createTopup({
              orderId: String(processing.id),
              gameId: String(processing.game_id),
              playerId: String(processing.player_id || processing.account_identifier || ''),
              server: (processing.server as string | null) || null,
              packageName: String(processing.package || ''),
              quantity: Number(processing.quantity || 1),
            });

      const completed = await this.setOrderStatus(orderId, 'completed', {
        provider_order_ref: result.providerRef,
        transaction_id: result.transactionId,
        provider_response: result.rawResponse || null,
      });

      return completed;
    } catch (error) {
      const failed = await this.setOrderStatus(orderId, 'failed', {
        provider_response: {
          message: error instanceof Error ? error.message : 'Fulfillment failed',
        },
      });

      return failed;
    }
  },
};
