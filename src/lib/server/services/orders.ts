import { randomUUID } from 'crypto';
import { ApiError } from '../http';
import { fawaterkPayment } from '../payments/fawaterk';
import type { FawaterkVerifyOptions } from '../payments/fawaterk';
import { enqueueTopupRequest } from '../queue/topupQueue';
import { serverEnv } from '../env';
import { supabaseAdmin } from '../supabaseAdmin';
import { cacheManager } from './cache/cacheManager';
import { fraudService } from './fraud';
import { logsService } from './logs';
import { providerRouter } from './providerRouter';
import { topupEngine } from './topupEngine';

export type CanonicalOrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'failed';
export type PaymentGateway = 'fawaterk';

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

const computeDiscountedPackagePrice = (pkg: {
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

  const byIdOrSlug = await supabaseAdmin
    .from('games')
    .select('*')
    .or(`id.eq.${normalized},slug.eq.${normalized}`)
    .limit(1)
    .maybeSingle();

  if (!byIdOrSlug.error) return byIdOrSlug.data;
  if (tableOrColumnMissing(byIdOrSlug.error.code)) {
    const fallback = await supabaseAdmin.from('games').select('*').eq('id', normalized).limit(1).maybeSingle();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  throw byIdOrSlug.error;
};

const safeFindProductByPackage = async (gameId: string, packageId: number) => {
  const existing = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('game_id', gameId)
    .eq('provider_product_id', `package:${packageId}`)
    .maybeSingle();

  if (!existing.error && existing.data) return existing.data;
  if (existing.error && !tableOrColumnMissing(existing.error.code)) throw existing.error;
  return null;
};

const safeInsertProduct = async (payload: {
  gameId: string;
  name: string;
  providerProductId: string;
  price: number;
  currency: string;
  active: boolean;
  provider?: 'reloadly' | 'gamesdrop';
}) => {
  const inserted = await supabaseAdmin
    .from('products')
    .insert({
      id: randomUUID(),
      game_id: payload.gameId,
      game: payload.gameId,
      name: payload.name,
      title: payload.name,
      provider: payload.provider || 'reloadly',
      provider_product_id: payload.providerProductId,
      price: payload.price,
      currency: payload.currency,
      active: payload.active,
    })
    .select('*')
    .single();

  if (inserted.error) {
    if (tableOrColumnMissing(inserted.error.code)) return null;
    throw inserted.error;
  }

  return inserted.data;
};

const safeInsertPayment = async (payload: {
  orderId: string;
  paymentId: string;
  amount: number;
  transactionId?: string | null;
  status: string;
  rawResponse?: unknown;
}) => {
  const inserted = await supabaseAdmin.from('payments').insert({
    id: payload.paymentId,
    order_id: payload.orderId,
    gateway: 'fawaterk',
    transaction_id: payload.transactionId || null,
    amount: payload.amount,
    status: payload.status,
    raw_response: payload.rawResponse || {},
  });

  if (inserted.error && !tableOrColumnMissing(inserted.error.code)) {
    throw inserted.error;
  }
};

const safeUpdatePaymentById = async (
  paymentId: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  const result = await supabaseAdmin.from('payments').update(updates).eq('id', paymentId).select('*').maybeSingle();
  if (result.error) {
    if (tableOrColumnMissing(result.error.code)) return null;
    throw result.error;
  }
  return (result.data as Record<string, unknown> | null) || null;
};

const safeUpdateLatestPayment = async (orderId: string, updates: Record<string, unknown>) => {
  const latest = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) {
    if (tableOrColumnMissing(latest.error.code)) return null;
    throw latest.error;
  }

  if (!latest.data?.id) return null;
  return safeUpdatePaymentById(String(latest.data.id), updates);
};

const safeInsertTransaction = async (payload: {
  orderId: string;
  provider: string;
  providerTxId?: string | null;
  response?: unknown;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paid';
}) => {
  const inserted = await supabaseAdmin.from('transactions').insert({
    id: randomUUID(),
    order_id: payload.orderId,
    provider: payload.provider,
    provider_tx_id: payload.providerTxId || null,
    provider_transaction_id: payload.providerTxId || null,
    response: payload.response || {},
    response_data: payload.response || {},
    status: payload.status,
  });

  if (inserted.error && !tableOrColumnMissing(inserted.error.code)) {
    throw inserted.error;
  }
};

const safeUpdateLatestTransaction = async (
  orderId: string,
  provider: string,
  updates: Record<string, unknown>,
) => {
  const latest = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('order_id', orderId)
    .eq('provider', provider)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) {
    if (tableOrColumnMissing(latest.error.code)) return null;
    throw latest.error;
  }

  if (!latest.data?.id) return null;

  const updated = await supabaseAdmin.from('transactions').update(updates).eq('id', latest.data.id);
  if (updated.error && !tableOrColumnMissing(updated.error.code)) {
    throw updated.error;
  }

  return latest.data.id;
};

const safeGetProductById = async (productId: string) => {
  const result = await supabaseAdmin.from('products').select('*').eq('id', productId).maybeSingle();
  if (result.error) {
    if (tableOrColumnMissing(result.error.code)) return null;
    throw result.error;
  }
  return result.data || null;
};

export const ordersService = {
  async listGames() {
    const cacheKey = 'cache:games:list';
    const cached = await cacheManager.getCachedJson<Record<string, unknown>[]>(cacheKey);
    if (Array.isArray(cached)) {
      return cached;
    }

    const { data, error } = await supabaseAdmin.from('games').select('*').order('name', { ascending: true });
    if (error) throw new ApiError(500, error.message, 'GAMES_FETCH_FAILED');
    const filtered = (data || []).filter((game) => (game as Record<string, unknown>).active !== false);
    await cacheManager.setCachedJson(cacheKey, filtered, 90);
    return filtered;
  },

  async getGameByIdentifier(identifier: string) {
    const game = await safeSelectGame(identifier);
    if (!game) throw new ApiError(404, 'Game not found', 'GAME_NOT_FOUND');
    return game;
  },

  async listPackagesForGame(gameIdentifier: string) {
    const game = await this.getGameByIdentifier(gameIdentifier);
    const gameRef = String((game as Record<string, unknown>).id);
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
    packageId: number;
    packageName?: string | null;
    playerId: string;
    server?: string | null;
    quantity: number;
    paymentDetails?: Record<string, unknown>;
    ipAddress?: string | null;
    country?: string | null;
    fraudRiskScore?: number | null;
  }) {
    if (!input.userId || !input.gameIdentifier || !input.playerId || Number(input.quantity || 0) <= 0) {
      throw new ApiError(400, 'Invalid order payload', 'INVALID_ORDER_PAYLOAD');
    }

    if (!Number.isFinite(input.packageId) || Number(input.packageId) <= 0) {
      throw new ApiError(400, 'package_id is required', 'PACKAGE_ID_REQUIRED');
    }

    const game = await this.getGameByIdentifier(input.gameIdentifier);
    const gameId = String((game as Record<string, unknown>).id);

    let packageAmount = 0;
    let unitPrice = 0;
    let packageLabel = input.packageName || 'Topup';
    const packageId = Number(input.packageId);
    let productId: string | null = null;
    let currency = 'EGP';
    let selectedProvider: string =
      String((game as Record<string, unknown>).provider_api || 'reloadly').toLowerCase() === 'gamesdrop' ? 'gamesdrop' : 'reloadly';

    const pkgRow = await supabaseAdmin
      .from('packages')
      .select('id, amount, price, discount_active, discount_type, discount_value, discount_ends_at')
      .eq('id', packageId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (pkgRow.error || !pkgRow.data) {
      throw new ApiError(400, 'Package not found', 'PACKAGE_NOT_FOUND');
    }

    packageAmount = Number(pkgRow.data.amount || 0);
    unitPrice = computeDiscountedPackagePrice(pkgRow.data);
    packageLabel =
      input.packageName ||
      `${pkgRow.data.amount} ${String((game as Record<string, unknown>).currency_name || '').trim()}`.trim() ||
      'Topup';

    const existingProduct = await safeFindProductByPackage(gameId, packageId);
    if (existingProduct?.id) {
      productId = String(existingProduct.id);
      currency = String((existingProduct as Record<string, unknown>).currency || 'EGP');
    } else {
      const createdProduct = await safeInsertProduct({
        gameId,
        name: packageLabel,
        providerProductId: `package:${packageId}`,
        price: unitPrice,
        currency: 'EGP',
        active: true,
        provider: selectedProvider === 'gamesdrop' ? 'gamesdrop' : 'reloadly',
      });
      productId = createdProduct?.id ? String(createdProduct.id) : null;
    }

    if (productId) {
      try {
        const product = await safeGetProductById(productId);
        const providerProductId = String((product as Record<string, unknown> | null)?.provider_product_id || '').trim();
        if (providerProductId) {
          const providerChoice = await providerRouter.selectBestProvider({
            productId,
            providerProductId,
            preferredProvider: selectedProvider as 'reloadly' | 'gamesdrop' | 'unipin' | 'seagm' | 'driffle',
            currency,
          });

          if (Number(providerChoice.finalPrice || 0) > 0) {
            unitPrice = Number(providerChoice.finalPrice);
          }
          selectedProvider = String(providerChoice.provider || selectedProvider);
        }
      } catch (error) {
        await logsService.write('pricing.fallback', 'Pricing router fallback to package price', {
          gameId,
          productId,
          reason: error instanceof Error ? error.message : 'Pricing unavailable',
        });
      }
    }

    const quantity = Math.max(1, Number(input.quantity || 1));
    const totalPrice = Number((unitPrice * quantity).toFixed(2));
    const orderId = randomUUID();

    const sanitizePaymentDetails = (details?: Record<string, unknown>) => {
      const clean = details && typeof details === 'object' ? { ...details } : {};
      delete (clean as Record<string, unknown>).cardNumber;
      delete (clean as Record<string, unknown>).cardCvv;
      delete (clean as Record<string, unknown>).cardExpiry;
      delete (clean as Record<string, unknown>).cvv;
      delete (clean as Record<string, unknown>).expiry;
      return clean;
    };

    const insertPayload: Record<string, unknown> = {
      id: orderId,
      user_id: input.userId,
      game_id: gameId,
      product_id: productId,
      package_id: packageId,
      amount: packageAmount * quantity,
      quantity,
      package: packageLabel,
      player_id: input.playerId,
      account_identifier: input.playerId,
      server: input.server || null,
      price: totalPrice,
      status: 'pending',
      provider: selectedProvider,
      payment_details: sanitizePaymentDetails(input.paymentDetails),
      currency,
      ip_address: input.ipAddress || null,
      country: input.country || null,
      fraud_risk_score: Number(input.fraudRiskScore || 0) || null,
    };

    let inserted = await supabaseAdmin.from('orders').insert(insertPayload).select('*').single();
    if (inserted.error && tableOrColumnMissing(inserted.error.code)) {
      delete insertPayload.ip_address;
      delete insertPayload.country;
      delete insertPayload.fraud_risk_score;
      inserted = await supabaseAdmin.from('orders').insert(insertPayload).select('*').single();
    }

    if (inserted.error || !inserted.data) {
      throw new ApiError(500, inserted.error?.message || 'Failed to create order', 'ORDER_CREATE_FAILED');
    }

    await logsService.write('order.created', 'Order created successfully', {
      orderId,
      userId: input.userId,
      gameId,
      provider: insertPayload.provider,
      amount: totalPrice,
    });

    return {
      order: inserted.data as Record<string, unknown>,
      price: totalPrice,
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
    return data as Record<string, unknown>;
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

    await logsService.write('order.status', 'Order status updated', {
      orderId,
      status,
      extra: extra || {},
    });

    return data as Record<string, unknown>;
  },

  async initiatePayment(params: { orderId: string; amount: number }) {
    const order = await this.getOrder(params.orderId);

    const session = await fawaterkPayment.createSession({
      orderId: params.orderId,
      amount: params.amount,
      customerEmail: null,
      customerName: null,
      currency: String(order.currency || 'EGP'),
    });

    const paymentId = randomUUID();
    await safeInsertPayment({
      orderId: params.orderId,
      paymentId,
      amount: params.amount,
      transactionId: session.transactionId,
      status: 'pending',
      rawResponse: session.rawResponse,
    });
    await safeInsertTransaction({
      orderId: params.orderId,
      provider: 'fawaterk',
      providerTxId: session.transactionId,
      response: session.rawResponse || {},
      status: 'pending',
    });

    const updates: Record<string, unknown> = {
      payment_id: paymentId,
      payment_invoice_id: session.paymentReference || session.transactionId || paymentId,
    };

    await this.setOrderStatus(params.orderId, 'pending', updates);

    await logsService.write('payment.created', 'Fawaterk payment session created', {
      orderId: params.orderId,
      paymentId,
      transactionId: session.transactionId,
    });

    return session;
  },

  async processPaidOrder(orderId: string) {
    return topupEngine.processOrder(orderId, { source: 'orders-service' });
  },

  async verifyPaymentAndFulfill(payload: Record<string, unknown>, verifyOptions?: FawaterkVerifyOptions) {
    const verification = fawaterkPayment.verifyPayload(payload, verifyOptions);
    if (!verification.valid) {
      throw new ApiError(400, verification.reason || 'Invalid payment signature', 'PAYMENT_SIGNATURE_INVALID');
    }

    const orderId = String(verification.orderId || '').trim();
    if (!orderId) {
      throw new ApiError(400, 'order_id is required', 'PAYMENT_VERIFY_BAD_REQUEST');
    }

    const order = await this.getOrder(orderId);
    const currentStatus = String(order.status || '').toLowerCase();
    if (currentStatus === 'completed' || currentStatus === 'processing') {
      return order;
    }
    if (currentStatus === 'paid') {
      return order;
    }
    const paymentId = String(order.payment_id || '').trim();
    const paymentCountry = String(
      payload.country ||
        payload.country_code ||
        payload.customer_country ||
        (payload.data && typeof payload.data === 'object'
          ? (payload.data as Record<string, unknown>).country || (payload.data as Record<string, unknown>).country_code
          : '') ||
        '',
    )
      .trim()
      .toUpperCase();

    const userId = String(order.user_id || '').trim();
    if (userId) {
      const fraudCheck = await fraudService.assessOrder({
        userId,
        ipAddress: String(order.ip_address || 'unknown'),
        playerId: String(order.player_id || order.account_identifier || ''),
        amount: Number(order.price || 0),
        paymentAmount: Number(verification.amount || order.price || 0),
        paymentCountry: paymentCountry || null,
      });

      if (fraudCheck.blocked) {
        return this.setOrderStatus(orderId, 'failed', {
          provider_response: {
            source: 'fraud',
            message: 'Order blocked by fraud protection',
            riskScore: fraudCheck.riskScore,
            reasons: fraudCheck.reasons,
          },
        });
      }
    }

    const paymentUpdatePayload: Record<string, unknown> = {
      status: verification.status === 'paid' ? 'paid' : 'failed',
      transaction_id: verification.transactionId || null,
      raw_response: payload,
    };

    if (paymentId) {
      await safeUpdatePaymentById(paymentId, paymentUpdatePayload);
    } else {
      await safeUpdateLatestPayment(orderId, paymentUpdatePayload);
    }
    await safeUpdateLatestTransaction(orderId, 'fawaterk', {
      status: verification.status === 'paid' ? 'paid' : 'failed',
      provider_tx_id: verification.transactionId || null,
      provider_transaction_id: verification.transactionId || null,
      response: payload,
      response_data: payload,
    });

    if (verification.status !== 'paid') {
      const failed = await this.setOrderStatus(orderId, 'failed', {
        provider_response: {
          source: 'fawaterk',
          message: 'Payment not confirmed as paid',
          payload,
        },
      });
      return failed;
    }

    const orderAmount = Number(order.price || 0);
    const paidAmount = Number(verification.amount || 0);
    if (orderAmount > 0 && paidAmount > 0) {
      const diff = Math.abs(orderAmount - paidAmount);
      if (diff > Math.max(1, orderAmount * 0.1)) {
        return this.setOrderStatus(orderId, 'failed', {
          provider_response: {
            source: 'fawaterk',
            message: 'Payment amount mismatch',
            expected: orderAmount,
            received: paidAmount,
          },
        });
      }
    }

    const paidOrder = await this.setOrderStatus(orderId, 'paid', {
      transaction_id: verification.transactionId || String(order.transaction_id || ''),
      provider_response: payload,
    });
    const queued = await enqueueTopupRequest({
      orderId,
      source: 'payment-webhook',
      requestedAt: new Date().toISOString(),
    });

    if (!queued.queued) {
      if (!serverEnv.allowSyncTopupFallback) {
        throw new ApiError(503, 'Topup queue unavailable', 'TOPUP_QUEUE_UNAVAILABLE');
      }
      return topupEngine.processOrder(orderId, { source: 'payment-webhook-fallback' });
    }

    return paidOrder;
  },

  async listAdminOrders(search = '', page = 1, limit = 40) {
    const offset = Math.max(0, (page - 1) * limit);
    let base = supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const q = String(search || '').trim();
    if (q) {
      const like = `%${q}%`;
      base = base.or(`id.ilike.${like},user_id.ilike.${like},package.ilike.${like},status.ilike.${like},provider.ilike.${like}`);
    }

    const result = await base;
    if (result.error) throw new ApiError(500, result.error.message, 'ADMIN_ORDERS_FETCH_FAILED');

    return (result.data || []) as Record<string, unknown>[];
  },

  async retryFailedOrder(orderId: string) {
    const order = await this.getOrder(orderId);
    const status = String(order.status || '').toLowerCase();
    if (status !== 'failed' && status !== 'paid') {
      throw new ApiError(400, 'Only failed/paid orders can be retried', 'RETRY_NOT_ALLOWED');
    }

    if (status === 'failed') {
      await this.setOrderStatus(orderId, 'paid', {
        provider_response: {
          retried_at: new Date().toISOString(),
          retried_from_status: 'failed',
        },
      });
    }

    const queued = await enqueueTopupRequest({
      orderId,
      source: 'admin-retry',
      requestedAt: new Date().toISOString(),
    });

    if (!queued.queued) {
      return topupEngine.processOrder(orderId, { source: 'admin-retry-fallback' });
    }

    return this.getOrder(orderId);
  },

  async listAdminPayments(page = 1, limit = 50) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_PAYMENTS_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async listAdminTransactions(page = 1, limit = 100) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_TRANSACTIONS_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async listAdminLogs(page = 1, limit = 100) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_LOGS_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async listAdminProducts(page = 1, limit = 200) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_PRODUCTS_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async listPublicProducts(gameId?: string) {
    const cached = await cacheManager.getCachedProducts(gameId);
    if (Array.isArray(cached)) return cached;

    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(200);

    if (gameId) query = query.eq('game_id', gameId);

    const rows = await query;
    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'PRODUCTS_FETCH_FAILED');
    }

    await cacheManager.setCachedProducts(rows.data || [], gameId);
    return rows.data || [];
  },

  async deleteAdminProduct(productId: string) {
    const existing = await supabaseAdmin.from('products').select('id, game_id').eq('id', productId).maybeSingle();
    const result = await supabaseAdmin.from('products').delete().eq('id', productId).select('id').maybeSingle();
    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) {
        throw new ApiError(500, 'Products table is missing. Run latest migration.', 'PRODUCTS_TABLE_MISSING');
      }
      throw new ApiError(500, result.error.message, 'ADMIN_PRODUCT_DELETE_FAILED');
    }

    if (existing.data?.game_id) {
      await cacheManager.invalidateCachedProducts(String(existing.data.game_id));
    } else {
      await cacheManager.invalidateCachedProducts();
    }
    await cacheManager.invalidateByPrefix('cache:api:public-products');

    await logsService.write('admin.product.delete', 'Admin deleted product', { productId });
    return Boolean(result.data?.id);
  },

  async listAdminUsers(search = '', page = 1, limit = 100) {
    const offset = Math.max(0, (page - 1) * limit);
    let rows = supabaseAdmin
      .from('users')
      .select('id, email, username, role, is_blocked, fraud_risk_score, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const q = String(search || '').trim();
    if (q) {
      const like = `%${q}%`;
      rows = rows.or(`email.ilike.${like},username.ilike.${like},role.ilike.${like}`);
    }

    const result = await rows;
    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) return [];
      throw new ApiError(500, result.error.message, 'ADMIN_USERS_FETCH_FAILED');
    }

    return result.data || [];
  },

  async updateAdminUserRole(userId: string, role: 'admin' | 'user') {
    const result = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, email, username, role, created_at')
      .maybeSingle();

    if (result.error || !result.data) {
      throw new ApiError(500, result.error?.message || 'Failed to update user role', 'ADMIN_USER_ROLE_UPDATE_FAILED');
    }

    await logsService.write('admin.user.role', 'Admin updated user role', { userId, role });
    return result.data;
  },

  async manualSetOrderStatus(orderId: string, status: CanonicalOrderStatus) {
    const order = await this.setOrderStatus(orderId, status, {
      provider_response: {
        manual_status_update_at: new Date().toISOString(),
        manual_status_update_to: status,
      },
    });
    await logsService.write('admin.order.status', 'Admin changed order status manually', { orderId, status });
    return order;
  },

  async upsertAdminGame(input: {
    id?: string;
    name: string;
    provider_api: 'reloadly' | 'gamesdrop';
    active?: boolean;
  }) {
    const id = String(input.id || randomUUID());
    const payload = {
      id,
      name: input.name,
      provider_api: input.provider_api,
      active: input.active !== false,
      // Legacy required columns fallback to keep old schema compatible.
      publisher: 'Unknown',
      image_url: 'https://picsum.photos/seed/game/800/600',
      currency_name: 'Credits',
      category: 'game',
      show_on_home: true,
      slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };

    const result = await supabaseAdmin.from('games').upsert(payload).select('*').single();
    if (result.error) {
      throw new ApiError(500, result.error.message, 'ADMIN_GAME_UPSERT_FAILED');
    }

    await cacheManager.invalidateByPrefix('cache:games:');
    await cacheManager.invalidateByPrefix('cache:api:public-games');

    await logsService.write('admin.game.upsert', 'Admin upserted game', { id, name: input.name });
    return result.data;
  },

  async upsertAdminProduct(input: {
    id?: string;
    game_id: string;
    name: string;
    provider_product_id: string;
    price: number;
    currency: string;
    active?: boolean;
    provider?: 'reloadly' | 'gamesdrop' | 'unipin' | 'seagm' | 'driffle';
    image?: string | null;
  }) {
    const normalizedProvider = String(input.provider || 'reloadly').toLowerCase();
    const provider =
      normalizedProvider === 'gamesdrop' ||
      normalizedProvider === 'unipin' ||
      normalizedProvider === 'seagm' ||
      normalizedProvider === 'driffle'
        ? normalizedProvider
        : 'reloadly';
    const payload = {
      id: String(input.id || randomUUID()),
      game_id: input.game_id,
      game: input.game_id,
      name: input.name,
      title: input.name,
      provider,
      image: input.image || null,
      provider_product_id: input.provider_product_id,
      price: Number(input.price),
      currency: input.currency || 'EGP',
      active: input.active !== false,
    };

    const result = await supabaseAdmin.from('products').upsert(payload).select('*').single();
    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) {
        throw new ApiError(500, 'Products table is missing. Run latest migration.', 'PRODUCTS_TABLE_MISSING');
      }
      throw new ApiError(500, result.error.message, 'ADMIN_PRODUCT_UPSERT_FAILED');
    }

    await cacheManager.invalidateCachedProducts(payload.game_id);
    await cacheManager.invalidateByPrefix('cache:api:public-products');

    await logsService.write('admin.product.upsert', 'Admin upserted product', {
      id: payload.id,
      game_id: payload.game_id,
      provider_product_id: payload.provider_product_id,
    });

    return result.data;
  },

  async listAdminProviderPrices(page = 1, limit = 200) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('provider_prices')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_PROVIDER_PRICES_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async listAdminFraudAlerts(page = 1, limit = 200) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('fraud_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_FRAUD_LOGS_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async listAdminProviderHealth() {
    const rows = await supabaseAdmin
      .from('provider_health')
      .select('*')
      .order('updated_at', { ascending: false });

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_PROVIDER_HEALTH_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async listAdminFailedOrders(page = 1, limit = 100) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_FAILED_ORDERS_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async upsertPricingRule(input: {
    productId: string;
    marginPercent: number;
    minProfit?: number;
    maxProfit?: number;
  }) {
    const payload = {
      product_id: input.productId,
      margin_percent: Number(input.marginPercent || 0),
      min_profit: Number(input.minProfit || 0),
      max_profit: Number(input.maxProfit || 0),
      updated_at: new Date().toISOString(),
    };

    const result = await supabaseAdmin.from('pricing_rules').upsert(payload, {
      onConflict: 'product_id',
      ignoreDuplicates: false,
    });

    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) {
        throw new ApiError(500, 'pricing_rules table is missing. Run latest migration.', 'PRICING_RULES_TABLE_MISSING');
      }
      throw new ApiError(500, result.error.message, 'ADMIN_PRICING_RULE_UPSERT_FAILED');
    }

    return payload;
  },

  async listAdminPricingRules(page = 1, limit = 300) {
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_PRICING_RULES_FETCH_FAILED');
    }

    return rows.data || [];
  },

  async setProviderEnabled(provider: string, enabled: boolean, priority?: number) {
    const normalized = String(provider || '').trim().toLowerCase();
    const result = await supabaseAdmin.from('provider_health').upsert(
      {
        provider: normalized,
        enabled,
        priority: Number.isFinite(Number(priority)) ? Number(priority) : undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' },
    );

    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) {
        throw new ApiError(500, 'provider_health table is missing. Run latest migration.', 'PROVIDER_HEALTH_TABLE_MISSING');
      }
      throw new ApiError(500, result.error.message, 'ADMIN_PROVIDER_HEALTH_UPDATE_FAILED');
    }

    await cacheManager.invalidateByPrefix('cache:api:public-providers');

    await logsService.write('admin.provider.enabled', 'Admin changed provider enabled flag', {
      provider: normalized,
      enabled,
      priority: Number.isFinite(Number(priority)) ? Number(priority) : null,
    });

    return { provider: normalized, enabled, priority: Number.isFinite(Number(priority)) ? Number(priority) : null };
  },

  async setUserBlocked(userId: string, blocked: boolean) {
    const result = await supabaseAdmin
      .from('users')
      .update({ is_blocked: blocked })
      .eq('id', userId)
      .select('id, email, username, role, is_blocked, fraud_risk_score, created_at')
      .maybeSingle();

    if (result.error || !result.data) {
      throw new ApiError(500, result.error?.message || 'Failed to update user block status', 'ADMIN_USER_BLOCK_UPDATE_FAILED');
    }

    await logsService.write('admin.user.block', 'Admin updated user block status', {
      userId,
      blocked,
    });

    return result.data;
  },

  async adjustUserFraudRisk(userId: string, delta: number) {
    const current = await supabaseAdmin.from('users').select('fraud_risk_score').eq('id', userId).maybeSingle();
    if (current.error || !current.data) {
      throw new ApiError(500, current.error?.message || 'User not found', 'ADMIN_USER_FRAUD_USER_NOT_FOUND');
    }

    const nextScore = Math.max(0, Number(current.data.fraud_risk_score || 0) + Number(delta || 0));
    const updated = await supabaseAdmin
      .from('users')
      .update({ fraud_risk_score: nextScore })
      .eq('id', userId)
      .select('id, email, username, role, is_blocked, fraud_risk_score, created_at')
      .maybeSingle();

    if (updated.error || !updated.data) {
      throw new ApiError(500, updated.error?.message || 'Failed to update user risk', 'ADMIN_USER_FRAUD_UPDATE_FAILED');
    }

    await logsService.write('admin.user.risk', 'Admin adjusted user fraud risk', {
      userId,
      delta,
      risk_score: nextScore,
    });

    return updated.data;
  },

  async listAdminSettings() {
    const rows = await supabaseAdmin.from('settings').select('*').order('key', { ascending: true });
    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return [];
      throw new ApiError(500, rows.error.message, 'ADMIN_SETTINGS_FETCH_FAILED');
    }
    return rows.data || [];
  },

  async upsertAdminSetting(input: {
    key: string;
    value: unknown;
    description?: string | null;
  }) {
    const payload = {
      key: String(input.key || '').trim(),
      value: input.value ?? {},
      description: input.description || null,
      updated_at: new Date().toISOString(),
    };

    if (!payload.key) {
      throw new ApiError(400, 'key is required', 'ADMIN_SETTING_KEY_REQUIRED');
    }

    const result = await supabaseAdmin.from('settings').upsert(payload, {
      onConflict: 'key',
      ignoreDuplicates: false,
    }).select('*').maybeSingle();

    if (result.error || !result.data) {
      if (tableOrColumnMissing(result.error?.code)) {
        throw new ApiError(500, 'settings table is missing. Run latest migration.', 'SETTINGS_TABLE_MISSING');
      }
      throw new ApiError(500, result.error?.message || 'Failed to update setting', 'ADMIN_SETTINGS_UPDATE_FAILED');
    }

    await logsService.write('admin.settings.update', 'Admin updated system setting', {
      key: payload.key,
    });

    return result.data;
  },

  async listAdminApiMonitor() {
    const [health, failures, transactions] = await Promise.all([
      this.listAdminProviderHealth(),
      supabaseAdmin.from('provider_failures').select('provider, created_at').order('created_at', { ascending: false }).limit(500),
      supabaseAdmin.from('transactions').select('provider, status, created_at').order('created_at', { ascending: false }).limit(1000),
    ]);

    const failureRows = failures.error ? [] : failures.data || [];
    const transactionRows = transactions.error ? [] : transactions.data || [];

    const byProvider = new Map<string, {
      provider: string;
      success: number;
      failed: number;
      total: number;
      responseTimeMs: number;
      lastFailureAt?: string | null;
      enabled?: boolean;
      priority?: number | null;
    }>();

    for (const row of health as Array<Record<string, unknown>>) {
      const provider = String(row.provider || '').toLowerCase();
      byProvider.set(provider, {
        provider,
        success: 0,
        failed: 0,
        total: 0,
        responseTimeMs: Number(row.last_response_ms || 0),
        lastFailureAt: null,
        enabled: row.enabled !== false,
        priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : null,
      });
    }

    for (const row of transactionRows as Array<Record<string, unknown>>) {
      const provider = String(row.provider || '').toLowerCase();
      const current = byProvider.get(provider) || {
        provider,
        success: 0,
        failed: 0,
        total: 0,
        responseTimeMs: 0,
        lastFailureAt: null,
        enabled: true,
        priority: null,
      };

      current.total += 1;
      if (String(row.status || '').toLowerCase().includes('fail')) {
        current.failed += 1;
      } else {
        current.success += 1;
      }

      byProvider.set(provider, current);
    }

    for (const row of failureRows as Array<Record<string, unknown>>) {
      const provider = String(row.provider || '').toLowerCase();
      const current = byProvider.get(provider) || {
        provider,
        success: 0,
        failed: 0,
        total: 0,
        responseTimeMs: 0,
        lastFailureAt: null,
        enabled: true,
        priority: null,
      };
      current.lastFailureAt = String(row.created_at || current.lastFailureAt || '');
      byProvider.set(provider, current);
    }

    return {
      providers: Array.from(byProvider.values()).map((item) => ({
        ...item,
        successRate: item.total > 0 ? Number(((item.success / item.total) * 100).toFixed(2)) : 0,
        errorRate: item.total > 0 ? Number(((item.failed / item.total) * 100).toFixed(2)) : 0,
      })),
    };
  },

  async adminRefundOrder(orderId: string) {
    const order = await this.getOrder(orderId);
    await this.setOrderStatus(orderId, 'failed', {
      provider_response: {
        refund_requested_at: new Date().toISOString(),
      },
    });

    const paymentId = String(order.payment_id || '').trim();
    if (paymentId) {
      await safeUpdatePaymentById(paymentId, {
        status: 'failed',
        raw_response: {
          refunded_at: new Date().toISOString(),
          source: 'admin',
          refunded: true,
        },
      });
    }

    await logsService.write('admin.order.refund', 'Admin refunded order', { orderId });
    return this.getOrder(orderId);
  },

  async adminCancelOrder(orderId: string) {
    const updated = await this.setOrderStatus(orderId, 'failed', {
      provider_response: {
        canceled_at: new Date().toISOString(),
        source: 'admin',
      },
    });
    await logsService.write('admin.order.cancel', 'Admin canceled order', { orderId });
    return updated;
  },

  async adminVerifyPayment(paymentId: string) {
    const updated = await safeUpdatePaymentById(paymentId, {
      status: 'paid',
      raw_response: {
        verified_at: new Date().toISOString(),
        source: 'admin',
      },
    });
    if (!updated) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    await logsService.write('admin.payment.verify', 'Admin verified payment', { paymentId });
    return updated;
  },

  async adminRefundPayment(paymentId: string) {
    const updated = await safeUpdatePaymentById(paymentId, {
      status: 'failed',
      raw_response: {
        refunded_at: new Date().toISOString(),
        source: 'admin',
        refunded: true,
      },
    });
    if (!updated) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    await logsService.write('admin.payment.refund', 'Admin refunded payment', { paymentId });
    return updated;
  },
};
