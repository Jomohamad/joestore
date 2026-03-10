import { supabaseAdmin } from '../supabaseAdmin';

export const fraudSignalsService = {
  async record(input: { userId?: string | null; orderId?: string | null; signalType: string; score: number; metadata?: Record<string, unknown> }) {
    await supabaseAdmin.from('fraud_signals').insert({
      user_id: input.userId || null,
      order_id: input.orderId || null,
      signal_type: input.signalType,
      score: Number(input.score || 0),
      metadata: input.metadata || {},
    });
  },
};
