import type { User } from '@supabase/supabase-js';
import { ApiError } from '../http';
import { supabaseAdmin } from '../supabaseAdmin';

const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const metaOf = (user: { user_metadata?: Record<string, unknown> | null }) =>
  (user.user_metadata || {}) as Record<string, unknown>;

export const profileService = {
  validateUsername(username: string) {
    return USERNAME_REGEX.test(username);
  },

  buildProfile(user: User, isAdmin = false) {
    const meta = metaOf(user);
    return {
      id: user.id,
      email: String(user.email || meta.email || ''),
      first_name: String(meta.first_name || ''),
      last_name: String(meta.last_name || ''),
      username: String(meta.username || ''),
      avatar_url: meta.avatar_url ? String(meta.avatar_url) : null,
      provider_avatar_url: meta.provider_avatar_url ? String(meta.provider_avatar_url) : null,
      onboarded: Boolean(meta.onboarded),
      is_admin: isAdmin,
    };
  },

  async isAdmin(userId: string) {
    const rpcResult = await supabaseAdmin.rpc('is_admin_user', { p_user_id: userId });
    if (!rpcResult.error) return Boolean(rpcResult.data);

    const { data, error } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (error) {
      if (error.code === '42P01' || error.code === '42883') return false;
      throw error;
    }

    return Boolean(data?.user_id);
  },

  async getUsernameOwner(username: string) {
    const lowered = String(username || '').trim().toLowerCase();
    if (!lowered) return null;

    const rpc = await supabaseAdmin.rpc('get_username_owner', { p_username: lowered });
    if (!rpc.error) {
      const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      const userId = row?.user_id;
      if (userId) return String(userId);
      return null;
    }

    const usersQuery = await supabaseAdmin.from('users').select('id').ilike('username', lowered).maybeSingle();
    if (!usersQuery.error && usersQuery.data?.id) {
      return String(usersQuery.data.id);
    }

    return null;
  },

  async completeProfile(params: {
    requester: User;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
    providerAvatarUrl?: string | null;
  }) {
    const firstName = params.firstName.trim();
    const lastName = params.lastName.trim();
    const username = params.username.trim().toLowerCase();
    const email = params.email.trim().toLowerCase();

    if (!firstName || !lastName) {
      throw new ApiError(400, 'First and last name are required', 'PROFILE_VALIDATION');
    }

    if (!USERNAME_REGEX.test(username)) {
      throw new ApiError(400, 'Username must be 3-30 chars and only letters, numbers, dot, underscore, or hyphen', 'PROFILE_VALIDATION');
    }

    if (!EMAIL_REGEX.test(email)) {
      throw new ApiError(400, 'Invalid email format', 'PROFILE_VALIDATION');
    }

    const owner = await this.getUsernameOwner(username);
    if (owner && owner !== params.requester.id) {
      throw new ApiError(409, 'Username is already taken', 'USERNAME_TAKEN');
    }

    const existing = metaOf(params.requester);
    const updatedMeta = {
      ...existing,
      first_name: firstName,
      last_name: lastName,
      username,
      avatar_url: params.avatarUrl || null,
      provider_avatar_url: params.providerAvatarUrl || existing.provider_avatar_url || null,
      email,
      onboarded: true,
    };

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(params.requester.id, {
      email,
      user_metadata: updatedMeta,
    });

    if (error || !data.user) {
      throw new ApiError(500, error?.message || 'Profile update failed', 'PROFILE_UPDATE_FAILED');
    }

    return data.user;
  },
};
