import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../src/lib/server/http';
import { profileService } from '../../src/lib/server/services/profile';
import { requireAuthUser } from '../../src/lib/server/auth';

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

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const rawUsername = String(req.query.username || '').trim();

  if (!profileService.validateUsername(rawUsername)) {
    return res.status(400).json({ available: false, suggestions: [], error: 'Invalid username format' });
  }

  let requesterId: string | null = null;
  try {
    const auth = await requireAuthUser(req);
    requesterId = auth.user.id;
  } catch {
    requesterId = null;
  }

  const owner = await profileService.getUsernameOwner(rawUsername);
  if (!owner || (requesterId && owner === requesterId)) {
    return res.status(200).json({ available: true, suggestions: [] });
  }

  const seeds = buildSuggestions(rawUsername);
  const suggestions: string[] = [];
  for (const candidate of seeds) {
    if (suggestions.length >= 5) break;
    const existing = await profileService.getUsernameOwner(candidate);
    if (!existing) suggestions.push(candidate);
  }

  return res.status(200).json({ available: false, suggestions });
});
