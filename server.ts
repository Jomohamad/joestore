import express from 'express';
import { createServer as createViteServer } from 'vite';
import supabase from './server/supabase.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
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

app.post('/api/verify-player', (req, res) => {
  const { gameId, playerId } = req.body;
  
  if (!gameId || !playerId) {
    return res.status(400).json({ error: 'Missing gameId or playerId' });
  }

  // Simulate network delay for verification
  setTimeout(() => {
    // Mock validation logic: 
    // In a real app, this would call the game's official API.
    // Here, we'll assume any ID with 5-15 digits/characters is valid.
    const isValidLength = playerId.length >= 5 && playerId.length <= 15;
    
    if (isValidLength) {
      // Generate a mock player name based on the ID to look realistic
      const mockNames = ['Sniper', 'Ghost', 'Ninja', 'Pro', 'King', 'Shadow', 'Viper'];
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const playerName = `${randomName}_${playerId.substring(0, 4)}`;
      
      res.json({ valid: true, playerName });
    } else {
      res.json({ valid: false, error: 'Invalid Player ID format' });
    }
  }, 1500); // 1.5s delay to simulate real API call
});

app.post('/api/orders', async (req, res) => {
  const { gameId, packageId, playerId, amount } = req.body;
  
  if (!gameId || !packageId || !playerId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const { error } = await supabase
      .from('orders')
      .insert([
        { 
          id: orderId, 
          game_id: gameId, 
          package_id: packageId, 
          player_id: playerId, 
          amount: amount, 
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
