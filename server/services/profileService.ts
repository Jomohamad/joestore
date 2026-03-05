import { supabaseAdmin } from '../supabase.js';
import { HttpError } from '../utils/http.js';

const getMeta = (user: { user_metadata?: Record<string, unknown> | null }) =>
  (user.user_metadata || {}) as Record<string, unknown>;

const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const profileService = {
  buildProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }, isAdmin = false) {
    const meta = getMeta(user);
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

  async getUsernameOwner(username: string) {
    const { data, error } = await supabaseAdmin.rpc('get_username_owner', { p_username: username });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : null;
    return result?.user_id ? String(result.user_id) : null;
  },

  validateUsername(username: string) {
    return USERNAME_REGEX.test(username);
  },

  async completeProfile(params: {
    requester: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
    providerAvatarUrl?: string | null;
  }) {
    const { requester } = params;

    if (!params.firstName || !params.lastName) {
      throw new HttpError(400, 'First and last name are required', 'PROFILE_VALIDATION');
    }

    if (!USERNAME_REGEX.test(params.username)) {
      throw new HttpError(400, 'Username must be 3-30 chars and only letters, numbers, dot, underscore, or hyphen', 'PROFILE_VALIDATION');
    }

    if (!EMAIL_REGEX.test(params.email)) {
      throw new HttpError(400, 'Invalid email format', 'PROFILE_VALIDATION');
    }

    const usernameOwner = await this.getUsernameOwner(params.username);
    if (usernameOwner && usernameOwner !== requester.id) {
      throw new HttpError(409, 'Username is already taken', 'USERNAME_TAKEN');
    }

    const meta = getMeta(requester);
    const updatedMeta = {
      ...meta,
      first_name: params.firstName,
      last_name: params.lastName,
      username: params.username,
      avatar_url: params.avatarUrl || null,
      provider_avatar_url: params.providerAvatarUrl || meta.provider_avatar_url || null,
      email: params.email,
      onboarded: true,
    };

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(requester.id, {
      email: params.email,
      user_metadata: updatedMeta,
    });

    if (error) {
      throw new HttpError(500, error.message, 'PROFILE_UPDATE_FAILED');
    }

    return data.user || requester;
  },
};
