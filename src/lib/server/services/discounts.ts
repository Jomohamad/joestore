import { supabaseAdmin } from '../supabaseAdmin';

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

const now = () => new Date();

export type DiscountResult = {
  amount: number;
  source: 'auto_rule' | 'none';
  rule?: Record<string, unknown>;
};

export const discountService = {
  async evaluate(input: { userId: string; gameId: string; category?: string | null; subtotal: number }) {
    const base = Number(input.subtotal || 0);
    if (!Number.isFinite(base) || base <= 0) {
      return { amount: 0, source: 'none' as const };
    }

    const rules = await supabaseAdmin
      .from('discount_rules')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (rules.error) {
      if (tableOrColumnMissing(rules.error.code)) return { amount: 0, source: 'none' as const };
      throw rules.error;
    }

    const nowAt = now();
    const candidates = (rules.data || []).filter((row) => {
      const starts = row.starts_at ? new Date(row.starts_at) : null;
      const ends = row.ends_at ? new Date(row.ends_at) : null;
      if (starts && starts > nowAt) return false;
      if (ends && ends < nowAt) return false;
      if (Number.isFinite(Number(row.max_uses)) && Number(row.max_uses) > 0 && Number(row.used_count || 0) >= Number(row.max_uses)) {
        return false;
      }
      if (row.scope === 'game' && String(row.game_id || '') !== input.gameId) return false;
      if (row.scope === 'category' && String(row.category || '') !== String(input.category || '')) return false;
      return true;
    });

    let firstPurchaseAllowed = false;
    if (candidates.some((row) => row.scope === 'first_purchase')) {
      const orders = await supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', input.userId)
        .in('status', ['paid', 'processing', 'completed']);
      if (!orders.error && Number(orders.count || 0) === 0) {
        firstPurchaseAllowed = true;
      }
    }

    let best: DiscountResult = { amount: 0, source: 'none' };

    for (const rule of candidates) {
      if (rule.scope === 'first_purchase' && !firstPurchaseAllowed) continue;
      const percent = Number(rule.percent || 0);
      const fixed = Number(rule.fixed_amount || 0);
      let discount = 0;
      if (percent > 0) {
        discount = base * (percent / 100);
      } else if (fixed > 0) {
        discount = fixed;
      }
      if (discount > best.amount) {
        best = { amount: discount, source: 'auto_rule', rule: rule as Record<string, unknown> };
      }
    }

    return best;
  },
};
