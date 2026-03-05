import { supabaseAdmin } from '../supabase.js';
import { HttpError } from '../utils/http.js';

export const gamesService = {
  async listGames() {
    const { data, error } = await supabaseAdmin.from('games').select('*').order('name', { ascending: true });
    if (error) {
      throw new HttpError(500, error.message, 'GAMES_FETCH_FAILED');
    }
    return data || [];
  },
};
