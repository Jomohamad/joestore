import express from 'express';
import supabase from './server/supabase.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;
const USERNAME_SANITIZE_REGEX = /[^A-Za-z0-9._-]/g;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasServiceRoleKey = Boolean(serviceRoleKey && !serviceRoleKey.includes('PASTE_YOUR_SERVICE_ROLE_KEY_HERE'));
const hasAdminClient = hasServiceRoleKey;

const getBearerToken = (authorization?: string) => {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim();
};

const getRequestUser = async (authorization?: string) => {
  const token = getBearerToken(authorization);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

const getMeta = (user: { user_metadata?: Record<string, unknown> | null }) =>
  (user.user_metadata || {}) as Record<string, unknown>;

const isUserAdmin = async (userId: string) => {
  // Preferred path: security-definer function (works even when server runs with anon key).
  const rpcResult = await supabase.rpc('is_admin_user', {
    p_user_id: userId,
  });

  if (!rpcResult.error) {
    return Boolean(rpcResult.data);
  }

  // Fallback path: direct table query (works when service role key is configured).
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // If admins table or function is not deployed yet, do not break auth flow.
    if (error.code === '42P01' || error.code === '42883') return false;
    throw error;
  }
  return Boolean(data?.user_id);
};

const buildProfileFromAuthUser = (
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
  isAdmin = false,
) => {
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
};

const getUsernameOwner = async (username: string) => {
  const { data, error } = await supabase.rpc('get_username_owner', {
    p_username: username,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : null;
  return result?.user_id ? String(result.user_id) : null;
};

const normalizeUsername = (value: string) => value.trim().toLowerCase();

const buildUsernameSuggestionSeeds = (rawUsername: string): string[] => {
  const base = normalizeUsername(rawUsername).replace(USERNAME_SANITIZE_REGEX, '').slice(0, 30);
  if (!base) return [];

  const compact = base.replace(/[._-]+/g, '');
  const year = new Date().getUTCFullYear().toString().slice(-2);
  const stems = [base, compact].filter(Boolean);
  const suffixes = ['1', '7', '9', '11', '22', '99', '123', year, '_01', '-eg', '.x', '_vip', '_pro'];
  const candidates = new Set<string>();

  for (const stem of stems) {
    if (USERNAME_REGEX.test(stem)) candidates.add(stem);

    for (const suffix of suffixes) {
      const candidate = `${stem}${suffix}`.slice(0, 30);
      if (USERNAME_REGEX.test(candidate)) {
        candidates.add(candidate);
      }
    }
  }

  return [...candidates];
};

const getAvailableUsernameSuggestions = async (
  requestedUsername: string,
  requesterId: string | null,
  limit = 5,
): Promise<string[]> => {
  const seeds = buildUsernameSuggestionSeeds(requestedUsername);
  const suggestions: string[] = [];

  for (const candidate of seeds) {
    if (suggestions.length >= limit) break;
    const owner = await getUsernameOwner(candidate);
    if (!owner || owner === requesterId) {
      suggestions.push(candidate);
    }
  }

  return suggestions;
};

const maskCardNumber = (cardNumber: string) => {
  const digits = cardNumber.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return {
    last4,
    masked: `**** **** **** ${last4}`,
  };
};

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase.from('games').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
  }
});

app.get('/api/profile/status', async (req, res) => {
  try {
    const requester = await getRequestUser(req.headers.authorization);
    if (!requester) {
      return res.status(401).json({ exists: false, onboarded: false, error: 'Unauthorized' });
    }

    const isAdmin = await isUserAdmin(requester.id);
    const profile = buildProfileFromAuthUser(requester, isAdmin);

    const exists = Boolean(profile.username && profile.first_name && profile.last_name);
    return res.json({
      exists,
      onboarded: Boolean(profile.onboarded),
      profile,
    });
  } catch (error) {
    console.error('Profile status failed:', error);
    return res.status(500).json({ exists: false, onboarded: false, error: 'Failed to load profile status' });
  }
});

app.post('/api/profile/complete', async (req, res) => {
  if (!hasAdminClient) {
    return res.status(503).json({ success: false, error: 'Profile completion requires SUPABASE_SERVICE_ROLE_KEY' });
  }

  try {
    const requester = await getRequestUser(req.headers.authorization);
    if (!requester) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const avatarUrl = req.body?.avatarUrl ? String(req.body.avatarUrl).trim() : null;
    const providerAvatarUrl = req.body?.providerAvatarUrl ? String(req.body.providerAvatarUrl).trim() : null;

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'First and last name are required' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ success: false, error: 'Username must be 3-30 characters and contain only letters, numbers, dots, underscores, or hyphens' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    const usernameOwner = await getUsernameOwner(username);
    if (usernameOwner && usernameOwner !== requester.id) {
      return res.status(409).json({ success: false, error: 'Username is already taken' });
    }
    const existingMeta = getMeta(requester);
    const updatedMeta = {
      ...existingMeta,
      first_name: firstName,
      last_name: lastName,
      username,
      avatar_url: avatarUrl,
      provider_avatar_url: providerAvatarUrl || existingMeta.provider_avatar_url || null,
      email,
      onboarded: true,
    };

    const { data, error } = await supabase.auth.admin.updateUserById(requester.id, {
      email,
      user_metadata: updatedMeta,
    });
    if (error) throw error;

    const isAdmin = await isUserAdmin(requester.id);
    return res.json({ success: true, profile: buildProfileFromAuthUser(data.user || requester, isAdmin) });
  } catch (error) {
    console.error('Profile completion failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to complete profile' });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const { data: games, error } = await supabase.from('games').select('*');
    if (error) throw error;
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

app.get('/api/promotions', async (req, res) => {
  try {
    const { data: promotions, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

app.get('/api/games/:id', async (req, res) => {
  try {
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    console.error('Error fetching game details:', error);
    res.status(500).json({ error: 'Failed to fetch game details' });
  }
});

app.get('/api/games/:id/packages', async (req, res) => {
  try {
    const { data: packages, error } = await supabase
      .from('packages')
      .select('*')
      .eq('game_id', req.params.id)
      .order('price', { ascending: true });

    if (error) throw error;
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

app.get('/api/check-username', async (req, res) => {
  const rawUsername = String(req.query.username || '').trim();

  if (!USERNAME_REGEX.test(rawUsername)) {
    return res.status(400).json({
      available: false,
      suggestions: [],
      error: 'Username must be 3-30 characters and contain only letters, numbers, dots, underscores, or hyphens',
    });
  }

  try {
    const requester = await getRequestUser(req.headers.authorization);
    const usernameOwner = await getUsernameOwner(rawUsername);
    if (!usernameOwner) {
      return res.json({ available: true, suggestions: [] });
    }

    const requesterId = requester?.id || null;
    const available = requesterId ? requesterId === usernameOwner : false;
    if (available) {
      return res.json({ available: true, suggestions: [] });
    }

    const suggestions = await getAvailableUsernameSuggestions(rawUsername, requesterId);
    return res.json({ available: false, suggestions });
  } catch (error) {
    console.error('Username check failed:', error);
    return res.status(500).json({ available: false, suggestions: [], error: 'Failed to check username' });
  }
});

app.delete('/api/user/delete', async (req, res) => {
  if (!hasServiceRoleKey) {
    return res.status(503).json({ success: false, error: 'Account deletion requires SUPABASE_SERVICE_ROLE_KEY' });
  }

  const requestedUsername = String(req.body?.username || '').trim();

  if (!USERNAME_REGEX.test(requestedUsername)) {
    return res.status(400).json({ success: false, error: 'Invalid username format' });
  }

  try {
    const requester = await getRequestUser(req.headers.authorization);
    if (!requester) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const meta = getMeta(requester);
    const currentUsername = String(meta.username || '').toLowerCase();
    if (!currentUsername || currentUsername !== requestedUsername.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Username does not match authenticated user' });
    }

    const { error } = await supabase.auth.admin.deleteUser(requester.id);
    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Account deletion failed:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : 'Failed to delete account';
    return res.status(500).json({ success: false, error: message || 'Failed to delete account' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { gameId, packageId, amount, paymentMethod, accountIdentifier, paymentDetails, quantity } = req.body || {};
  const parsedPackageId = Number(packageId);
  const parsedAmount = Number(amount);
  const parsedQuantity = Number(quantity);
  const normalizedPaymentMethod = String(paymentMethod || '').trim().toLowerCase();
  const normalizedAccountIdentifier = String(accountIdentifier || '').trim();
  const rawPaymentDetails: Record<string, unknown> =
    paymentDetails && typeof paymentDetails === 'object' ? (paymentDetails as Record<string, unknown>) : {};
  const safePaymentDetails: Record<string, unknown> = {};

  if (
    typeof gameId !== 'string' ||
    !gameId.trim() ||
    !Number.isInteger(parsedPackageId) ||
    parsedPackageId <= 0 ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity <= 0
  ) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  if (!normalizedAccountIdentifier) {
    return res.status(400).json({ error: 'Account identifier is required' });
  }

  if (!['fawry', 'wallet', 'card', 'paypal'].includes(normalizedPaymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  if (normalizedPaymentMethod === 'wallet') {
    const walletPhone = String(rawPaymentDetails.walletPhone || '').trim();
    const walletProvider = String(rawPaymentDetails.walletProvider || '').trim();
    if (!/^[0-9+][0-9\s-]{7,19}$/.test(walletPhone)) {
      return res.status(400).json({ error: 'Wallet phone is invalid' });
    }
    safePaymentDetails.wallet_phone = walletPhone;
    if (walletProvider) safePaymentDetails.wallet_provider = walletProvider;
  }

  if (normalizedPaymentMethod === 'paypal') {
    const paypalId = String(rawPaymentDetails.paypalId || '').trim();
    if (paypalId.length < 3) {
      return res.status(400).json({ error: 'PayPal account ID is required' });
    }
    safePaymentDetails.paypal_id = paypalId;
  }

  if (normalizedPaymentMethod === 'card') {
    const cardHolder = String(rawPaymentDetails.cardHolder || '').trim();
    const expiry = String(rawPaymentDetails.expiry || '').trim();
    const cardNumber = String(rawPaymentDetails.cardNumber || '').trim();
    const cvv = String(rawPaymentDetails.cvv || '').trim();
    const normalizedCardDigits = cardNumber.replace(/\D/g, '');

    if (!cardHolder) {
      return res.status(400).json({ error: 'Card holder name is required' });
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return res.status(400).json({ error: 'Card expiry must be in MM/YY format' });
    }
    if (normalizedCardDigits.length < 12 || normalizedCardDigits.length > 19) {
      return res.status(400).json({ error: 'Card number is invalid' });
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({ error: 'CVV is invalid' });
    }

    const maskedCard = maskCardNumber(normalizedCardDigits);
    safePaymentDetails.card_holder = cardHolder;
    safePaymentDetails.expiry = expiry;
    safePaymentDetails.card_last4 = maskedCard.last4;
    safePaymentDetails.masked_card_number = maskedCard.masked;
  }

  if (normalizedPaymentMethod === 'fawry') {
    safePaymentDetails.channel = 'fawry';
  }

  try {
    const { data: pkg, error: packageError } = await supabase
      .from('packages')
      .select('id, game_id')
      .eq('id', parsedPackageId)
      .single();

    if (packageError || !pkg) {
      return res.status(400).json({ error: 'Package not found' });
    }

    if (pkg.game_id !== gameId) {
      return res.status(400).json({ error: 'Package does not belong to the selected game' });
    }

    const requester = await getRequestUser(req.headers.authorization);
    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const { error } = await supabase
      .from('orders')
      .insert([
        {
          id: orderId,
          user_id: requester?.id ?? null,
          game_id: gameId,
          package_id: parsedPackageId,
          amount: parsedAmount,
          status: 'COMPLETED',
          payment_method: normalizedPaymentMethod,
          account_identifier: normalizedAccountIdentifier,
          payment_details: safePaymentDetails,
          quantity: parsedQuantity,
        },
      ]);

    if (error) throw error;

    res.json({ success: true, orderId, status: 'COMPLETED' });
  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const startDevServer = async () => {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  };
  startDevServer();
}

export default app;
