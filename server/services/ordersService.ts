import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../supabase.js';
import { HttpError } from '../utils/http.js';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentProvider = 'paymob' | 'fawrypay';

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

export interface CreateOrderInput {
  userId: string;
  gameId: string;
  packageId?: number | null;
  packageName?: string | null;
  accountIdentifier: string;
  server?: string | null;
  quantity: number;
  paymentProvider: PaymentProvider;
  paymentMethod: 'fawry' | 'wallet' | 'card' | 'paypal';
  paymentDetails: Record<string, unknown>;
}

export const ordersService = {
  async createOrder(input: CreateOrderInput) {
    const quantity = Number(input.quantity || 1);
    if (!input.userId || !input.gameId || !input.accountIdentifier || quantity <= 0) {
      throw new HttpError(400, 'Invalid order payload', 'INVALID_ORDER_PAYLOAD');
    }

    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id, name, provider_api, currency_name')
      .eq('id', input.gameId)
      .maybeSingle();

    if (gameError || !game) {
      throw new HttpError(400, 'Game not found', 'GAME_NOT_FOUND');
    }

    let packageRow: {
      id: number;
      amount: number;
      price: number;
      discount_active?: boolean | null;
      discount_type?: 'percent' | 'fixed' | null;
      discount_value?: number | null;
      discount_ends_at?: string | null;
    } | null = null;

    if (input.packageId) {
      const { data, error } = await supabaseAdmin
        .from('packages')
        .select('id, amount, price, discount_active, discount_type, discount_value, discount_ends_at')
        .eq('id', input.packageId)
        .eq('game_id', input.gameId)
        .maybeSingle();

      if (error || !data) {
        throw new HttpError(400, 'Package not found', 'PACKAGE_NOT_FOUND');
      }
      packageRow = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('packages')
        .select('id, amount, price, discount_active, discount_type, discount_value, discount_ends_at')
        .eq('game_id', input.gameId)
        .order('price', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        throw new HttpError(400, 'Package not found for game', 'PACKAGE_NOT_FOUND');
      }
      packageRow = data;
    }

    const unitPrice = computePackagePrice(packageRow);
    const price = Number((unitPrice * quantity).toFixed(2));

    const orderId = randomUUID();
    const packageLabel = input.packageName || `${packageRow.amount} ${String(game.currency_name || '').trim()}`.trim();

    const insertPayload = {
      id: orderId,
      user_id: input.userId,
      game_id: input.gameId,
      package_id: packageRow.id,
      amount: packageRow.amount * quantity,
      quantity,
      player_id: input.accountIdentifier,
      account_identifier: input.accountIdentifier,
      server: input.server || null,
      package: packageLabel,
      price,
      payment_provider: input.paymentProvider,
      payment_method: input.paymentMethod,
      status: 'pending' as OrderStatus,
      payment_details: input.paymentDetails,
    };

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !order) {
      throw new HttpError(500, insertError?.message || 'Failed to create order', 'ORDER_CREATE_FAILED');
    }

    return {
      order,
      fulfillmentProvider: String(game.provider_api || 'reloadly').toLowerCase() as 'reloadly' | 'gamesdrop',
      price,
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

    if (error) {
      throw new HttpError(500, error.message, 'ORDERS_FETCH_FAILED');
    }

    return data || [];
  },

  async getOrderById(orderId: string) {
    const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (error) {
      throw new HttpError(500, error.message, 'ORDER_FETCH_FAILED');
    }
    if (!data) {
      throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }
    return data;
  },

  async setOrderStatus(orderId: string, status: OrderStatus, extra?: Record<string, unknown>) {
    const patch: Record<string, unknown> = {
      status,
      ...extra,
    };

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .select('*')
      .single();

    if (error || !data) {
      throw new HttpError(500, error?.message || 'Failed to update order', 'ORDER_UPDATE_FAILED');
    }

    return data;
  },
};
