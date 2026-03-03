import express from 'express';
import supabase from './server/supabase.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

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

const getCurrentProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
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

    const profile = await getCurrentProfile(requester.id);
    if (!profile) {
      return res.json({ exists: false, onboarded: false });
    }

    return res.json({
      exists: true,
      onboarded: Boolean(profile.onboarded),
      profile,
    });
  } catch (error) {
    console.error('Profile status failed:', error);
    return res.status(500).json({ exists: false, onboarded: false, error: 'Failed to load profile status' });
  }
});

app.post('/api/profile/complete', async (req, res) => {
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
      return res.status(400).json({ success: false, error: 'Username must be 3-30 characters and contain only letters, numbers, or underscores' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    const { data: usernameMatch, error: usernameMatchError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .neq('id', requester.id)
      .maybeSingle();

    if (usernameMatchError) throw usernameMatchError;
    if (usernameMatch) {
      return res.status(409).json({ success: false, error: 'Username is already taken' });
    }

    const { data: emailMatch, error: emailMatchError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .neq('id', requester.id)
      .maybeSingle();

    if (emailMatchError) throw emailMatchError;
    if (emailMatch) {
      return res.status(409).json({ success: false, error: 'Email is already in use' });
    }

    const payload = {
      id: requester.id,
      email,
      first_name: firstName,
      last_name: lastName,
      username,
      avatar_url: avatarUrl,
      provider_avatar_url: providerAvatarUrl,
      onboarded: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;

    return res.json({ success: true, profile: data });
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
      error: 'Username must be 3-30 characters and contain only letters, numbers, or underscores',
    });
  }

  try {
    const requester = await getRequestUser(req.headers.authorization);

    const { data: match, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', rawUsername)
      .maybeSingle();

    if (error) throw error;

    if (!match) {
      return res.json({ available: true });
    }

    const available = requester ? requester.id === match.id : false;
    return res.json({ available });
  } catch (error) {
    console.error('Username check failed:', error);
    return res.status(500).json({ available: false, error: 'Failed to check username' });
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

    const profile = await getCurrentProfile(requester.id);
    if (!profile || String(profile.username || '').toLowerCase() !== requestedUsername.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Username does not match authenticated user' });
    }

    const { error } = await supabase.auth.admin.deleteUser(requester.id);
    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Account deletion failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { gameId, packageId, amount } = req.body || {};
  const parsedPackageId = Number(packageId);
  const parsedAmount = Number(amount);

  if (
    typeof gameId !== 'string' ||
    !gameId.trim() ||
    !Number.isInteger(parsedPackageId) ||
    parsedPackageId <= 0 ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0
  ) {
    return res.status(400).json({ error: 'Invalid order payload' });
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
          player_id: 'WEB-CHECKOUT',
          status: 'COMPLETED',
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
