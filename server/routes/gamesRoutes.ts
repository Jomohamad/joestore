import { Router } from 'express';
import { gamesService } from '../services/gamesService.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { supabaseAdmin } from '../supabase.js';

export const gamesRoutes = Router();

gamesRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const games = await gamesService.listGames();
    res.json(games);
  }),
);

gamesRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin.from('games').select('*').eq('id', req.params.id).maybeSingle();
    if (error || !data) {
      throw new HttpError(404, 'Game not found', 'GAME_NOT_FOUND');
    }
    res.json(data);
  }),
);

gamesRoutes.get(
  '/:id/packages',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('game_id', req.params.id)
      .order('price', { ascending: true });

    if (error) {
      throw new HttpError(500, error.message, 'PACKAGES_FETCH_FAILED');
    }

    res.json(data || []);
  }),
);
