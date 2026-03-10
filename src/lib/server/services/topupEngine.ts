import { randomUUID } from 'crypto';
import { ApiError } from '../http';
import { supabaseAdmin } from '../supabaseAdmin';
import { cacheManager } from './cache/cacheManager';
import { logsService } from './logs';
import { providerRouter } from './providerRouter';
import { topupManager, type TopupProvider } from './topup/topupManager';

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

const getOrder = async (orderId: string) => {
  const row = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (row.error || !row.data) {
    throw new ApiError(404, row.error?.message || 'Order not found', 'ORDER_NOT_FOUND');
  }
  return row.data as Record<string, unknown>;
};

const setOrderStatus = async (orderId: string, status: string, extra?: Record<string, unknown>) => {
  const row = await supabaseAdmin
    .from('orders')
    .update({ status, ...(extra || {}) })
    .eq('id', orderId)
    .select('*')
    .maybeSingle();

  if (row.error || !row.data) {
    throw new ApiError(500, row.error?.message || 'Failed to update order', 'ORDER_UPDATE_FAILED');
  }

  return row.data as Record<string, unknown>;
};

const insertTransaction = async (payload: {
  orderId: string;
  provider: string;
  providerTxId?: string | null;
  response: unknown;
  status: string;
}) => {
  const op = await supabaseAdmin.from('transactions').insert({
    id: randomUUID(),
    order_id: payload.orderId,
    provider: payload.provider,
    provider_tx_id: payload.providerTxId || null,
    provider_transaction_id: payload.providerTxId || null,
    response: payload.response || {},
    response_data: payload.response || {},
    status: payload.status,
  });

  if (op.error && !tableOrColumnMissing(op.error.code)) {
    throw op.error;
  }
};

const getProduct = async (productId: string) => {
  if (!productId) return null;
  const row = await supabaseAdmin.from('products').select('*').eq('id', productId).maybeSingle();
  if (row.error) {
    if (tableOrColumnMissing(row.error.code)) return null;
    throw row.error;
  }
  return (row.data as Record<string, unknown> | null) || null;
};

const uniqueProviders = (providers: TopupProvider[]) => {
  const seen = new Set<string>();
  const result: TopupProvider[] = [];
  for (const provider of providers) {
    if (seen.has(provider)) continue;
    seen.add(provider);
    result.push(provider);
  }
  return result;
};

const buildProvidersSequence = (
  preferred: TopupProvider | null,
  rankedProviders: TopupProvider[],
): TopupProvider[] => {
  const baseline: TopupProvider[] = ['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'];
  const merged = [...(preferred ? [preferred] : []), ...rankedProviders, ...baseline];
  return uniqueProviders(merged);
};

export const topupEngine = {
  async processOrder(orderId: string, context?: { source?: string; force?: boolean }) {
    const order = await getOrder(orderId);
    const status = String(order.status || '').toLowerCase();

    if (status === 'completed') return order;
    if (status === 'processing' && !context?.force) return order;
    if (
      (status === 'paid' || status === 'processing') &&
      (order.provider_order_ref || order.transaction_id) &&
      !context?.force
    ) {
      return order;
    }
    if (status !== 'paid' && status !== 'processing' && status !== 'failed') {
      throw new ApiError(400, 'Order is not ready for processing', 'ORDER_NOT_READY_FOR_TOPUP');
    }

    const processingOrder = await setOrderStatus(orderId, 'processing', {
      processing_source: context?.source || 'system',
    });

    const productId = String(processingOrder.product_id || '').trim();
    const product = await getProduct(productId);
    const providerProductId = String(product?.provider_product_id || '').trim();

    const preferredProvider = String(product?.provider || processingOrder.provider || '').toLowerCase();
    const preferred = (['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'].includes(preferredProvider)
      ? preferredProvider
      : 'reloadly') as TopupProvider;

    let ranked: TopupProvider[] = [];
    if (productId && providerProductId) {
      const providerSelection = await providerRouter.selectBestProvider({
        productId,
        providerProductId,
        preferredProvider: preferred,
        currency: String(processingOrder.currency || 'EGP'),
      });

      ranked = (providerSelection.ranked || [])
        .map((row) => String((row as Record<string, unknown>).provider || '').toLowerCase())
        .filter((provider): provider is TopupProvider =>
          ['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'].includes(provider),
        );
    }

    const providers = buildProvidersSequence(preferred, ranked);
    const attempted: TopupProvider[] = [];

    const topupInput = {
      orderId: String(processingOrder.id || orderId),
      gameId: String(processingOrder.game_id || ''),
      playerId: String(processingOrder.player_id || processingOrder.account_identifier || ''),
      server: processingOrder.server ? String(processingOrder.server) : null,
      packageName: String(processingOrder.package || ''),
      quantity: Number(processingOrder.quantity || 1),
      providerProductId: providerProductId || null,
      amount: Number(processingOrder.price || 0),
      currency: String(processingOrder.currency || 'EGP').toUpperCase(),
    };

    let finalError: Error | null = null;

    for (const provider of providers) {
      attempted.push(provider);

      try {
        const startedAt = Date.now();
        const result = await topupManager.process(provider, topupInput);
        const responseTimeMs = Math.max(1, Date.now() - startedAt);

        await providerRouter.recordProviderSuccess({
          provider,
          responseTimeMs,
        });

        await insertTransaction({
          orderId,
          provider,
          providerTxId: result.transactionId,
          response: result.rawResponse || {},
          status: result.rawStatus,
        });

        await cacheManager.cacheTopupResults(orderId, {
          provider,
          status: result.rawStatus,
          providerRef: result.providerRef,
          transactionId: result.transactionId,
        });

        if (result.rawStatus === 'failed') {
          throw new Error('Provider returned failed status');
        }

        if (result.rawStatus === 'processing') {
          const updated = await setOrderStatus(orderId, 'processing', {
            provider,
            provider_order_ref: result.providerRef,
            transaction_id: result.transactionId,
            provider_response: result.rawResponse || {},
          });

          await logsService.write('topup.processing', 'Top-up is processing at provider', {
            orderId,
            provider,
          });

          return updated;
        }

        const updated = await setOrderStatus(orderId, 'completed', {
          provider,
          provider_order_ref: result.providerRef,
          transaction_id: result.transactionId,
          provider_response: result.rawResponse || {},
        });

        await logsService.write('topup.completed', 'Top-up completed', {
          orderId,
          provider,
        });

        return updated;
      } catch (error) {
        finalError = error instanceof Error ? error : new Error('Provider execution failed');

        await providerRouter.recordProviderFailure({
          provider,
          productId,
          orderId,
          reason: finalError.message,
          metadata: {
            attemptedProviders: attempted,
          },
        });

        await insertTransaction({
          orderId,
          provider,
          response: {
            message: finalError.message,
            attemptedProviders: attempted,
          },
          status: 'failed',
        });

        const fallback = providerRouter.fallbackProvider(provider, attempted);
        if (!fallback) break;
      }
    }

    const failed = await setOrderStatus(orderId, 'failed', {
      provider_response: {
        message: finalError?.message || 'All providers failed',
        attempted,
      },
    });

    await logsService.write('topup.failed', 'Top-up failed after provider failover', {
      orderId,
      attempted,
      reason: finalError?.message || 'All providers failed',
    });

    return failed;
  },
};
