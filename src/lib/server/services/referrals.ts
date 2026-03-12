import { randomUUID } from 'crypto';
import { ApiError } from '../http';
import { supabaseAdmin } from '../supabaseAdmin';
import { walletService } from './wallet';

const tableOrColumnMissing = (code: string | undefined) => code === '42P01' || code === '42703' || code === '42883';

const buildCode = () => `J${randomUUID().slice(0, 8).toUpperCase()}`;

export const referralService = {
  async getOrCreateCode(userId: string) {
    const existing = await supabaseAdmin.from('referral_codes').select('*').eq('user_id', userId).maybeSingle();
    if (!existing.error && existing.data?.code) return existing.data;
    if (existing.error && !tableOrColumnMissing(existing.error.code)) throw existing.error;

    const code = buildCode();
    const inserted = await supabaseAdmin.from('referral_codes').insert({ user_id: userId, code }).select('*').single();
    if (inserted.error) {
      if (tableOrColumnMissing(inserted.error.code)) {
        throw new ApiError(500, 'Referral schema missing. Run latest migration.', 'REFERRAL_SCHEMA_MISSING');
      }
      throw inserted.error;
    }
    return inserted.data;
  },

  async claimCode(input: { userId: string; code: string }) {
    const code = String(input.code || '').trim().toUpperCase();
    if (!code) throw new ApiError(400, 'Referral code is required', 'REFERRAL_CODE_REQUIRED');

    const owner = await supabaseAdmin.from('referral_codes').select('user_id, code').eq('code', code).maybeSingle();
    if (owner.error) {
      if (tableOrColumnMissing(owner.error.code)) {
        throw new ApiError(500, 'Referral schema missing. Run latest migration.', 'REFERRAL_SCHEMA_MISSING');
      }
      throw owner.error;
    }
    if (!owner.data?.user_id) throw new ApiError(404, 'Referral code not found', 'REFERRAL_CODE_NOT_FOUND');

    if (String(owner.data.user_id) === input.userId) {
      throw new ApiError(400, 'You cannot use your own referral code', 'REFERRAL_SELF');
    }

    const existing = await supabaseAdmin
      .from('referral_attributions')
      .select('id')
      .eq('referred_user_id', input.userId)
      .maybeSingle();
    if (!existing.error && existing.data?.id) {
      throw new ApiError(409, 'Referral already claimed', 'REFERRAL_ALREADY_CLAIMED');
    }

    const inserted = await supabaseAdmin.from('referral_attributions').insert({
      referrer_user_id: owner.data.user_id,
      referred_user_id: input.userId,
      status: 'pending',
      reward_amount: 0,
      reward_currency: 'EGP',
    });

    if (inserted.error) {
      throw inserted.error;
    }

    return { claimed: true };
  },

  async applyRewardIfEligible(input: { userId: string; orderId: string; amount: number }) {
    const rows = await supabaseAdmin
      .from('referral_attributions')
      .select('*')
      .eq('referred_user_id', input.userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (rows.error) {
      if (tableOrColumnMissing(rows.error.code)) return null;
      throw rows.error;
    }
    if (!rows.data) return null;

    const rewardAmount = Math.max(0, Number(((input.amount || 0) * 0.05).toFixed(2)));
    if (rewardAmount <= 0) return null;

    await walletService.credit({
      userId: String(rows.data.referrer_user_id),
      amount: rewardAmount,
      currency: String(rows.data.reward_currency || 'EGP'),
      source: 'referral_reward',
      referenceType: 'order',
      referenceId: input.orderId,
      metadata: { referredUserId: input.userId },
    });

    await supabaseAdmin
      .from('referral_attributions')
      .update({
        status: 'rewarded',
        reward_amount: rewardAmount,
        order_id: input.orderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rows.data.id);

    return { rewardAmount };
  },
};
