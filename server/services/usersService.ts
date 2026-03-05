import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../supabase.js';

const getMeta = (user: { user_metadata?: Record<string, unknown> | null }) =>
  (user.user_metadata || {}) as Record<string, unknown>;

export const buildAppUser = (user: User) => {
  const meta = getMeta(user);
  return {
    id: user.id,
    email: String(user.email || ''),
    username: String(meta.username || ''),
    created_at: user.created_at,
  };
};

export const syncPublicUserFromAuth = async (user: User) => {
  const meta = getMeta(user);
  const email = String(user.email || '').trim().toLowerCase();
  const username = String(meta.username || '').trim() || null;

  if (!email) return;

  await supabaseAdmin.from('users').upsert(
    {
      id: user.id,
      email,
      username,
      password_hash: 'SUPABASE_MANAGED',
    },
    { onConflict: 'id' },
  );
};
