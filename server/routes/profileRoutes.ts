import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { profileService } from '../services/profileService.js';
import { supabaseAdmin } from '../supabase.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const profileRoutes = Router();

const isUserAdmin = async (userId: string) => {
  const rpcResult = await supabaseAdmin.rpc('is_admin_user', { p_user_id: userId });
  if (!rpcResult.error) {
    return Boolean(rpcResult.data);
  }

  const { data, error } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) {
    if (error.code === '42P01' || error.code === '42883') return false;
    throw error;
  }

  return Boolean(data?.user_id);
};

const buildSuggestions = (username: string) => {
  const base = username.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30);
  if (!base) return [] as string[];

  const suffixes = ['1', '7', '11', '22', '99', '_01', '-eg', '.x', '_pro'];
  const out = new Set<string>();

  for (const suffix of suffixes) {
    const candidate = `${base}${suffix}`.slice(0, 30);
    if (profileService.validateUsername(candidate)) {
      out.add(candidate);
    }
  }

  return [...out];
};

profileRoutes.get(
  '/status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const requester = req.authUser;
    if (!requester) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const isAdmin = await isUserAdmin(requester.id);
    const profile = profileService.buildProfile(requester, isAdmin);
    const exists = Boolean(profile.username && profile.first_name && profile.last_name);

    res.json({
      exists,
      onboarded: Boolean(profile.onboarded),
      profile,
    });
  }),
);

profileRoutes.post(
  '/complete',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const requester = req.authUser;
    if (!requester) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const updated = await profileService.completeProfile({
      requester,
      firstName: String(req.body?.firstName || '').trim(),
      lastName: String(req.body?.lastName || '').trim(),
      username: String(req.body?.username || '').trim(),
      email: String(req.body?.email || '').trim().toLowerCase(),
      avatarUrl: req.body?.avatarUrl ? String(req.body.avatarUrl).trim() : null,
      providerAvatarUrl: req.body?.providerAvatarUrl ? String(req.body.providerAvatarUrl).trim() : null,
    });

    const isAdmin = await isUserAdmin(updated.id);
    res.json({ success: true, profile: profileService.buildProfile(updated, isAdmin) });
  }),
);

profileRoutes.get(
  '/check-username',
  asyncHandler(async (req, res) => {
    const rawUsername = String(req.query.username || '').trim();

    if (!profileService.validateUsername(rawUsername)) {
      return res.status(400).json({
        available: false,
        suggestions: [],
        error: 'Invalid username format',
      });
    }

    let requesterId: string | null = null;
    const authorization = String(req.headers.authorization || '');
    if (authorization.startsWith('Bearer ')) {
      const token = authorization.slice('Bearer '.length).trim();
      const { data } = await supabaseAdmin.auth.getUser(token);
      requesterId = data.user?.id || null;
    }
    const owner = await profileService.getUsernameOwner(rawUsername);

    if (!owner) {
      return res.json({ available: true, suggestions: [] });
    }

    if (requesterId && requesterId === owner) {
      return res.json({ available: true, suggestions: [] });
    }

    const seeds = buildSuggestions(rawUsername);
    const suggestions: string[] = [];
    for (const candidate of seeds) {
      if (suggestions.length >= 5) break;
      const existing = await profileService.getUsernameOwner(candidate);
      if (!existing) suggestions.push(candidate);
    }

    return res.json({ available: false, suggestions });
  }),
);
