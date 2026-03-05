import { Router } from 'express';
import { asyncHandler } from '../utils/http.js';
import { supabaseAdmin } from '../supabase.js';

export const miscRoutes = Router();

miscRoutes.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const { error } = await supabaseAdmin.from('games').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'ok', database: 'connected' });
  }),
);

miscRoutes.get(
  '/promotions',
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  }),
);
