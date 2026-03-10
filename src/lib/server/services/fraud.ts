import { randomUUID } from 'crypto';
import { serverEnv } from '../env';
import { supabaseAdmin } from '../supabaseAdmin';
import { logsService } from './logs';
import { cacheManager } from './cache/cacheManager';
import { queueJobService } from './queueJobs';

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

const normalizeIp = (value: string) => String(value || '').trim();

const scoreFromReasons = (reasons: string[]) => {
  let score = 0;
  for (const reason of reasons) {
    if (reason.includes('frequency')) score += 30;
    else if (reason.includes('vpn')) score += 30;
    else if (reason.includes('country_mismatch')) score += 25;
    else if (reason.includes('payment_mismatch')) score += 35;
    else if (reason.includes('player_id')) score += 20;
    else score += 10;
  }
  return Math.min(100, score);
};

const fetchCountryByIp = async (ipAddress: string) => {
  const ip = normalizeIp(ipAddress);
  if (!ip || ip === 'unknown') return null;

  const cacheKey = `cache:geo:${ip}`;
  const cached = await cacheManager.getCachedJson<Record<string, unknown>>(cacheKey);
  if (cached) {
    return cached as { country?: string | null; vpn?: boolean; raw?: Record<string, unknown> };
  }

  const base = serverEnv.geolocationApiBase.replace(/\/$/, '');
  const queryToken = serverEnv.geolocationApiKey ? `?apiKey=${encodeURIComponent(serverEnv.geolocationApiKey)}` : '/json/';
  const url = base.includes('{ip}')
    ? base.replace('{ip}', encodeURIComponent(ip))
    : `${base}/${encodeURIComponent(ip)}${queryToken}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !body) return null;

    const country = String(body.country_code || body.country || body.countryCode || '').toUpperCase();
    const vpn = Boolean(body.security && typeof body.security === 'object' ? (body.security as Record<string, unknown>).is_vpn : false);
    const result = {
      country: country || null,
      vpn,
      raw: body,
    };
    await cacheManager.setCachedJson(cacheKey, result, 3600);
    return result;
  } catch {
    return null;
  }
};

const countRecentOrders = async (input: { userId: string; ipAddress: string; minutes: number }) => {
  const since = new Date(Date.now() - input.minutes * 60_000).toISOString();

  const userOrders = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .gte('created_at', since);

  const ipOrders = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', input.ipAddress)
    .gte('created_at', since);

  if (userOrders.error && !tableOrColumnMissing(userOrders.error.code)) throw userOrders.error;
  if (ipOrders.error && !tableOrColumnMissing(ipOrders.error.code)) throw ipOrders.error;

  return {
    userCount: Number(userOrders.count || 0),
    ipCount: Number(ipOrders.count || 0),
  };
};

export const fraudService = {
  async assessOrder(input: {
    userId: string;
    ipAddress: string;
    playerId: string;
    amount: number;
    paymentAmount?: number;
    paymentCountry?: string | null;
  }) {
    const reasons: string[] = [];

    const ipAddress = normalizeIp(input.ipAddress);
    const geo = await fetchCountryByIp(ipAddress);
    const country = geo?.country || null;

    const frequency = await countRecentOrders({
      userId: input.userId,
      ipAddress,
      minutes: 1,
    });

    if (frequency.userCount >= serverEnv.fraudMaxOrdersPerMinute || frequency.ipCount >= serverEnv.fraudMaxOrdersPerMinute) {
      reasons.push('high_order_frequency');
    }

    const playerId = String(input.playerId || '').trim();
    if (!playerId || playerId.length < 4 || !/^[a-zA-Z0-9_-]+$/.test(playerId)) {
      reasons.push('invalid_player_id');
    }

    if (geo?.vpn) {
      reasons.push('vpn_detected');
    }

    const paymentCountry = String(input.paymentCountry || '').trim().toUpperCase();
    if (paymentCountry && country && paymentCountry !== country) {
      reasons.push('country_mismatch');
    }

    const paymentAmount = Number(input.paymentAmount || input.amount || 0);
    const orderAmount = Number(input.amount || 0);
    if (paymentAmount > 0 && orderAmount > 0) {
      const diff = Math.abs(paymentAmount - orderAmount);
      if (diff > Math.max(1, orderAmount * 0.1)) {
        reasons.push('payment_mismatch');
      }
    }

    const riskScore = scoreFromReasons(reasons);
    const blocked = riskScore >= serverEnv.fraudBlockRiskScore;

    const fraudRow = await supabaseAdmin.from('fraud_logs').insert({
      id: randomUUID(),
      user_id: input.userId,
      ip_address: ipAddress || null,
      risk_score: riskScore,
      reason: reasons.join(',') || 'none',
      country: country || null,
      metadata: {
        reasons,
        frequency,
        vpn: geo?.vpn || false,
      },
      created_at: new Date().toISOString(),
    });

    if (fraudRow.error && !tableOrColumnMissing(fraudRow.error.code)) {
      throw fraudRow.error;
    }

    if (reasons.length > 0) {
      await logsService.write('fraud.detected', 'Fraud signals detected', {
        userId: input.userId,
        ipAddress,
        reasons,
        riskScore,
      });
    }

    try {
      await queueJobService.enqueue('fraud.ml_score', {
        userId: input.userId,
        orderId: null,
        score: riskScore,
        reasons,
        country,
      });
    } catch {
      // ignore queue failures
    }

    return {
      blocked,
      riskScore,
      reasons,
      country,
      vpn: Boolean(geo?.vpn),
    };
  },
};
