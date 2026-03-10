import { randomUUID } from 'crypto';
import { ApiError } from '../http';
import { supabaseAdmin } from '../supabaseAdmin';
import { fawaterkPayment, type FawaterkVerifyOptions } from '../payments/fawaterk';
import { walletService } from './wallet';

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

const buildTopupId = () => `wallet_${randomUUID()}`;

export const walletTopupService = {
  async createTopup(input: { userId: string; amount: number; currency?: string }) {
    const amount = Number(input.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'Wallet topup amount is invalid', 'WALLET_TOPUP_INVALID');
    }

    const id = buildTopupId();
    const currency = String(input.currency || 'EGP').toUpperCase();

    const session = await fawaterkPayment.createSession({
      orderId: id,
      amount,
      currency,
      customerEmail: null,
      customerName: null,
    });

    const inserted = await supabaseAdmin.from('wallet_topups').insert({
      id,
      user_id: input.userId,
      amount,
      currency,
      status: 'pending',
      payment_reference: session.paymentReference,
      transaction_id: session.transactionId,
      raw_response: session.rawResponse || {},
    });

    if (inserted.error) {
      if (tableOrColumnMissing(inserted.error.code)) {
        throw new ApiError(500, 'Wallet topups schema missing. Run latest migration.', 'WALLET_TOPUP_SCHEMA_MISSING');
      }
      throw inserted.error;
    }

    return {
      topupId: id,
      checkoutUrl: session.checkoutUrl,
      paymentReference: session.paymentReference,
    };
  },

  async verifyAndCredit(payload: Record<string, unknown>, options?: FawaterkVerifyOptions) {
    const verification = fawaterkPayment.verifyPayload(payload, options);
    if (!verification.valid) {
      throw new ApiError(400, verification.reason || 'Invalid payment signature', 'PAYMENT_SIGNATURE_INVALID');
    }

    const topupId = String(verification.orderId || '').trim();
    if (!topupId.startsWith('wallet_')) {
      return { handled: false as const };
    }

    const existing = await supabaseAdmin.from('wallet_topups').select('*').eq('id', topupId).maybeSingle();
    if (existing.error) {
      if (tableOrColumnMissing(existing.error.code)) {
        throw new ApiError(500, 'Wallet topups schema missing. Run latest migration.', 'WALLET_TOPUP_SCHEMA_MISSING');
      }
      throw existing.error;
    }

    if (!existing.data) {
      return { handled: false as const };
    }

    const currentStatus = String(existing.data.status || '').toLowerCase();
    if (currentStatus === 'paid') {
      return { handled: true as const, status: 'paid' as const, topupId };
    }

    if (verification.status !== 'paid') {
      await supabaseAdmin
        .from('wallet_topups')
        .update({
          status: 'failed',
          raw_response: payload,
          transaction_id: verification.transactionId || existing.data.transaction_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', topupId);
      return { handled: true as const, status: 'failed' as const, topupId };
    }

    await walletService.credit({
      userId: String(existing.data.user_id),
      amount: Number(verification.amount || existing.data.amount || 0),
      currency: String(existing.data.currency || 'EGP'),
      source: 'wallet_topup',
      referenceType: 'wallet_topup',
      referenceId: topupId,
      metadata: { payment: payload },
    });

    await supabaseAdmin
      .from('wallet_topups')
      .update({
        status: 'paid',
        raw_response: payload,
        transaction_id: verification.transactionId || existing.data.transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topupId);

    return { handled: true as const, status: 'paid' as const, topupId };
  },

  async getTopupStatus(topupId: string) {
    const result = await supabaseAdmin.from('wallet_topups').select('*').eq('id', topupId).maybeSingle();
    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) {
        throw new ApiError(500, 'Wallet topups schema missing. Run latest migration.', 'WALLET_TOPUP_SCHEMA_MISSING');
      }
      throw result.error;
    }
    if (!result.data) {
      throw new ApiError(404, 'Wallet topup not found', 'WALLET_TOPUP_NOT_FOUND');
    }
    return result.data as Record<string, unknown>;
  },
};
