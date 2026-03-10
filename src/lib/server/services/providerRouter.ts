import { randomUUID } from 'crypto';
import { driffleProvider } from '../providers/driffle';
import { gamesdropProvider } from '../providers/gamesdrop';
import { reloadlyProvider } from '../providers/reloadly';
import { seagmProvider } from '../providers/seagm';
import { unipinProvider } from '../providers/unipin';
import { supabaseAdmin } from '../supabaseAdmin';
import { cacheManager } from './cache/cacheManager';
import { logsService } from './logs';
import { alertsService } from './alerts';
import type { TopupProvider } from './topup/topupManager';

export type ExtendedProvider = TopupProvider;

const providerPriority: ExtendedProvider[] = ['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'];

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

const providerPricingClients: Record<ExtendedProvider, { getPrice: (providerProductId: string, currency?: string) => Promise<Record<string, unknown>> }> = {
  reloadly: reloadlyProvider,
  gamesdrop: gamesdropProvider,
  unipin: unipinProvider,
  seagm: seagmProvider,
  driffle: driffleProvider,
};

const upsertProviderPrice = async (payload: {
  provider: ExtendedProvider;
  productId: string;
  price: number;
  currency: string;
}) => {
  const op = await supabaseAdmin.from('provider_prices').upsert(
    {
      provider: payload.provider,
      product_id: payload.productId,
      price: payload.price,
      currency: payload.currency,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'provider,product_id',
      ignoreDuplicates: false,
    },
  );

  if (op.error && !tableOrColumnMissing(op.error.code)) {
    throw op.error;
  }
};

const getProviderHealth = async () => {
  const rows = await supabaseAdmin.from('provider_health').select('*');
  if (rows.error) {
    if (tableOrColumnMissing(rows.error.code)) return new Map<string, Record<string, unknown>>();
    throw rows.error;
  }

  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows.data || []) {
    map.set(String((row as Record<string, unknown>).provider || '').toLowerCase(), row as Record<string, unknown>);
  }
  return map;
};

const loadCachedOrDbProviderPrices = async (productId: string) => {
  const cached = await cacheManager.getProviderPrices(productId);
  if (cached) return cached;

  const rows = await supabaseAdmin
    .from('provider_prices')
    .select('provider, price, currency, updated_at')
    .eq('product_id', productId)
    .order('updated_at', { ascending: false });

  if (rows.error) {
    if (tableOrColumnMissing(rows.error.code)) return null;
    throw rows.error;
  }

  const map: Record<string, unknown> = {};
  for (const row of rows.data || []) {
    const provider = String((row as Record<string, unknown>).provider || '').toLowerCase();
    if (!provider) continue;
    map[provider] = row;
  }

  await cacheManager.cacheProviderPrices(productId, map);
  return map;
};

const getPricingRule = async (productId: string) => {
  const row = await supabaseAdmin
    .from('pricing_rules')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (row.error) {
    if (tableOrColumnMissing(row.error.code)) return null;
    throw row.error;
  }

  return (row.data as Record<string, unknown> | null) || null;
};

export const providerRouter = {
  providers: providerPriority,

  async compareAndStoreProviderPrices(input: {
    productId: string;
    providerProductId: string;
    currency?: string;
    providers?: ExtendedProvider[];
  }) {
    const currency = String(input.currency || 'EGP').toUpperCase();
    const candidates = (input.providers && input.providers.length > 0 ? input.providers : providerPriority).filter(Boolean);

    const prices: Array<{ provider: ExtendedProvider; price: number; currency: string; source: string; rawResponse?: unknown }> = [];

    const results = await Promise.allSettled(
      candidates.map(async (provider) => {
        const result = await providerPricingClients[provider].getPrice(input.providerProductId, currency);
        const price = Number((result as Record<string, unknown>).price || 0);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error('Provider returned invalid price');
        }

        await upsertProviderPrice({
          provider,
          productId: input.productId,
          price,
          currency,
        });

        return {
          provider,
          price,
          currency,
          source: String((result as Record<string, unknown>).source || 'api'),
          rawResponse: (result as Record<string, unknown>).rawResponse,
        };
      }),
    );

    for (const [index, result] of results.entries()) {
      const provider = candidates[index];
      if (result.status === 'fulfilled') {
        prices.push(result.value);
      } else {
        await this.recordProviderFailure({
          provider,
          productId: input.productId,
          reason: result.reason instanceof Error ? result.reason.message : 'Provider pricing failed',
        });
      }
    }

    await cacheManager.cacheProviderPrices(input.productId, {
      updatedAt: new Date().toISOString(),
      providers: prices,
    });

    return prices;
  },

  async calculateFinalPrice(productId: string, providerPrice: number) {
    const normalizedProviderPrice = Number(providerPrice || 0);
    if (!Number.isFinite(normalizedProviderPrice) || normalizedProviderPrice <= 0) {
      return 0;
    }

    const rule = await getPricingRule(productId);
    if (!rule) return Number(normalizedProviderPrice.toFixed(2));

    const marginPercent = Number(rule.margin_percent || 0);
    const minProfit = Number(rule.min_profit || 0);
    const maxProfit = Number(rule.max_profit || Number.POSITIVE_INFINITY);

    let profit = normalizedProviderPrice * (marginPercent / 100);
    if (Number.isFinite(minProfit)) profit = Math.max(profit, minProfit);
    if (Number.isFinite(maxProfit)) profit = Math.min(profit, maxProfit);

    return Number((normalizedProviderPrice + profit).toFixed(2));
  },

  async selectBestProvider(input: {
    productId: string;
    providerProductId: string;
    preferredProvider?: ExtendedProvider | null;
    currency?: string;
  }) {
    const preferred = (input.preferredProvider || null) as ExtendedProvider | null;
    const health = await getProviderHealth();

    const freshPrices = await this.compareAndStoreProviderPrices({
      productId: input.productId,
      providerProductId: input.providerProductId,
      currency: input.currency,
    });

    let priceRows = freshPrices;
    if (!priceRows.length) {
      const cached = await loadCachedOrDbProviderPrices(input.productId);
      const fromCached = Array.isArray((cached as Record<string, unknown> | null)?.providers)
        ? ((cached as Record<string, unknown>).providers as Array<Record<string, unknown>>)
        : [];

      if (fromCached.length > 0) {
        priceRows = fromCached
          .map((row) => ({
            provider: String(row.provider || '').toLowerCase() as ExtendedProvider,
            price: Number(row.price || 0),
            currency: String(row.currency || input.currency || 'EGP').toUpperCase(),
            source: String(row.source || 'cache'),
          }))
          .filter((row) => providerPriority.includes(row.provider) && Number.isFinite(row.price) && row.price > 0);
      }
    }

    const ranked = priceRows
      .filter((row) => {
        const h = health.get(row.provider);
        if (!h) return true;
        if (h.enabled === false) return false;
        return true;
      })
      .map((row) => {
        const h = health.get(row.provider);
        const failures = Number(h?.failure_count || 0);
        const success = Number(h?.success_count || 0);
        const healthPenalty = failures > success ? 0.35 : 0;
        const preferredBoost = preferred && row.provider === preferred ? -0.05 : 0;
        const priorityBoost = providerPriority.indexOf(row.provider) * 0.01;
        const score = row.price * (1 + healthPenalty + priorityBoost + preferredBoost);
        return {
          ...row,
          score,
        };
      })
      .sort((a, b) => a.score - b.score);

    if (!ranked.length) {
      const fallback = preferred || 'reloadly';
      return {
        provider: fallback,
        providerPrice: 0,
        finalPrice: 0,
        ranked: [] as Array<Record<string, unknown>>,
      };
    }

    const winner = ranked[0];
    const finalPrice = await this.calculateFinalPrice(input.productId, winner.price);

    return {
      provider: winner.provider,
      providerPrice: winner.price,
      finalPrice,
      ranked,
    };
  },

  fallbackProvider(currentProvider: ExtendedProvider, attemptedProviders: ExtendedProvider[]) {
    const attempted = new Set<ExtendedProvider>([...attemptedProviders, currentProvider]);
    for (const provider of providerPriority) {
      if (!attempted.has(provider)) return provider;
    }
    return null;
  },

  async recordProviderFailure(input: {
    provider: ExtendedProvider;
    productId?: string;
    orderId?: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    const payload = {
      id: randomUUID(),
      provider: input.provider,
      product_id: input.productId || null,
      order_id: input.orderId || null,
      reason: input.reason,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
    };

    const failureInsert = await supabaseAdmin.from('provider_failures').insert(payload);
    if (failureInsert.error && !tableOrColumnMissing(failureInsert.error.code)) {
      throw failureInsert.error;
    }

    const existing = await supabaseAdmin
      .from('provider_health')
      .select('provider, success_count, failure_count, enabled')
      .eq('provider', input.provider)
      .maybeSingle();
    const successCount = Number(existing.data?.success_count || 0);
    const failureCount = Number(existing.data?.failure_count || 0);

    const upsertHealth = await supabaseAdmin.from('provider_health').upsert(
      {
        provider: input.provider,
        failure_count: failureCount + 1,
        success_count: successCount,
        enabled: existing.data?.enabled === false ? false : true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' },
    );

    if (upsertHealth.error && !tableOrColumnMissing(upsertHealth.error.code)) {
      throw upsertHealth.error;
    }

    await logsService.write('provider.failure', 'Provider failure recorded', {
      provider: input.provider,
      reason: input.reason,
      orderId: input.orderId || null,
    });

    try {
      await alertsService.notify('provider.failure', `Provider ${input.provider} failure`, {
        provider: input.provider,
        reason: input.reason,
        orderId: input.orderId || null,
      });
    } catch {
      // ignore alert failures
    }
  },

  async recordProviderSuccess(input: {
    provider: ExtendedProvider;
    responseTimeMs: number;
  }) {
    const existing = await supabaseAdmin
      .from('provider_health')
      .select('provider, success_count, failure_count, enabled')
      .eq('provider', input.provider)
      .maybeSingle();
    const successCount = Number(existing.data?.success_count || 0);
    const failureCount = Number(existing.data?.failure_count || 0);

    const upsert = await supabaseAdmin.from('provider_health').upsert(
      {
        provider: input.provider,
        success_count: successCount + 1,
        failure_count: failureCount,
        enabled: existing.data?.enabled === false ? false : true,
        last_response_ms: input.responseTimeMs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' },
    );

    if (upsert.error && !tableOrColumnMissing(upsert.error.code)) {
      throw upsert.error;
    }
  },
};
