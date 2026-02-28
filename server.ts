import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/games', (req, res) => {
    try {
      const games = db.prepare('SELECT * FROM games').all();
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch games' });
    }
  });

  app.get('/api/games/:id', (req, res) => {
    try {
      const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch game details' });
    }
  });

  app.get('/api/games/:id/packages', (req, res) => {
    try {
      const packages = db.prepare('SELECT * FROM packages WHERE game_id = ? ORDER BY price ASC').all(req.params.id);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch packages' });
    }
  });

  app.post('/api/orders', (req, res) => {
    const { gameId, packageId, playerId, amount } = req.body;
    
    if (!gameId || !packageId || !playerId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const orderId = 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const insertOrder = db.prepare(`
        INSERT INTO orders (id, game_id, package_id, player_id, amount, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      insertOrder.run(orderId, gameId, packageId, playerId, amount, 'COMPLETED');
      
      res.json({ success: true, orderId, status: 'COMPLETED' });
    } catch (error) {
      console.error('Order creation failed:', error);
      res.status(500).json({ error: 'Failed to process order' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
