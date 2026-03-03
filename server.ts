import express from 'express';
import supabase from './server/supabase.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,30}$/;
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

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('games').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
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
  const username = rawUsername.toLowerCase();

  if (!USERNAME_REGEX.test(rawUsername)) {
    return res.status(400).json({
      available: false,
      error: 'Username must be 3-30 characters and contain only letters, numbers, or underscores',
    });
  }

  if (!hasServiceRoleKey) {
    return res.status(503).json({
      available: false,
      error: 'Username check requires SUPABASE_SERVICE_ROLE_KEY',
    });
  }

  try {
    const requester = await getRequestUser(req.headers.authorization);
    let page = 1;
    const perPage = 200;

    while (page <= 10) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const match = data.users.find((user) => {
        const current = String(user.user_metadata?.username || '').toLowerCase();
        return current === username;
      });

      if (match) {
        const available = requester ? requester.id === match.id : false;
        return res.json({ available });
      }

      if (data.users.length < perPage) break;
      page += 1;
    }

    return res.json({ available: true });
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
  const normalizedUsername = requestedUsername.toLowerCase();

  if (!USERNAME_REGEX.test(requestedUsername)) {
    return res.status(400).json({ success: false, error: 'Invalid username format' });
  }

  try {
    const requester = await getRequestUser(req.headers.authorization);
    if (!requester) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userUsername = String(requester.user_metadata?.username || '').toLowerCase();
    if (!userUsername || userUsername !== normalizedUsername) {
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
          status: 'COMPLETED' 
        }
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
