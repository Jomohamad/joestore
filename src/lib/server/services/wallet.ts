import { ApiError } from '../http';
import { supabaseAdmin } from '../supabaseAdmin';

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

export const walletService = {
  async getWallet(userId: string) {
    const result = await supabaseAdmin.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) {
        return { user_id: userId, balance: 0, currency: 'EGP', updated_at: null };
      }
      throw result.error;
    }
    if (!result.data) {
      return { user_id: userId, balance: 0, currency: 'EGP', updated_at: null };
    }
    return result.data as Record<string, unknown>;
  },

  async listTransactions(userId: string, page = 1, limit = 50) {
    const offset = Math.max(0, (page - 1) * limit);
    const result = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (result.error) {
      if (tableOrColumnMissing(result.error.code)) return [];
      throw result.error;
    }
    return result.data || [];
  },

  async applyTransaction(input: {
    userId: string;
    amount: number;
    type: 'credit' | 'debit';
    currency?: string;
    source?: string;
    referenceType?: string | null;
    referenceId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const amount = Number(input.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'Wallet amount must be positive', 'WALLET_AMOUNT_INVALID');
    }

    const { data, error } = await supabaseAdmin.rpc('apply_wallet_transaction', {
      p_user_id: input.userId,
      p_amount: amount,
      p_type: input.type,
      p_currency: input.currency || 'EGP',
      p_source: input.source || 'system',
      p_reference_type: input.referenceType || null,
      p_reference_id: input.referenceId || null,
      p_metadata: input.metadata || {},
    });

    if (error) {
      const message = String(error.message || '');
      if (/insufficient/i.test(message)) {
        throw new ApiError(402, 'Insufficient wallet balance', 'WALLET_INSUFFICIENT');
      }
      if (tableOrColumnMissing(error.code)) {
        throw new ApiError(500, 'Wallet schema missing. Run latest migration.', 'WALLET_SCHEMA_MISSING');
      }
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      transactionId: String(row?.transaction_id || ''),
      newBalance: Number(row?.new_balance || 0),
    };
  },

  async credit(input: { userId: string; amount: number; currency?: string; source?: string; referenceType?: string | null; referenceId?: string | null; metadata?: Record<string, unknown> }) {
    return this.applyTransaction({
      userId: input.userId,
      amount: input.amount,
      type: 'credit',
      currency: input.currency,
      source: input.source,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: input.metadata,
    });
  },

  async debit(input: { userId: string; amount: number; currency?: string; source?: string; referenceType?: string | null; referenceId?: string | null; metadata?: Record<string, unknown> }) {
    return this.applyTransaction({
      userId: input.userId,
      amount: input.amount,
      type: 'debit',
      currency: input.currency,
      source: input.source,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: input.metadata,
    });
  },
};
