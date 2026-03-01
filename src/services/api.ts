import { Game, Package } from '../types';
import { supabase } from '../lib/supabase';

export const fetchGames = async (): Promise<Game[]> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*');
      
    if (error) {
      console.error('Supabase error fetching games:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
};

export const fetchGameDetails = async (id: string): Promise<Game> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Supabase error fetching game details:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching game details:', error);
    throw error;
  }
};

export const fetchGamePackages = async (id: string): Promise<Package[]> => {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('game_id', id)
      .order('price', { ascending: true });
      
    if (error) {
      console.error('Supabase error fetching packages:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
};

export const verifyPlayerId = async (gameId: string, playerId: string): Promise<{ valid: boolean; playerName?: string; error?: string }> => {
  // Mock validation logic client-side to avoid server dependency
  return new Promise((resolve) => {
    setTimeout(() => {
      const isValidLength = playerId.length >= 5 && playerId.length <= 15;
      
      if (isValidLength) {
        const mockNames = ['Sniper', 'Ghost', 'Ninja', 'Pro', 'King', 'Shadow', 'Viper'];
        const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
        const playerName = `${randomName}_${playerId.substring(0, 4)}`;
        
        resolve({ valid: true, playerName });
      } else {
        resolve({ valid: false, error: 'Invalid Player ID format' });
      }
    }, 1500);
  });
};

export const fetchWishlist = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('game_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map(item => item.game_id);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return [];
  }
};

export const addToWishlistApi = async (userId: string, gameId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('wishlist')
      .insert([{ user_id: userId, game_id: gameId }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

export const removeFromWishlistApi = async (userId: string, gameId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', gameId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

export const createOrder = async (orderData: {
  gameId: string;
  packageId: number;
  playerId: string;
  amount: number;
}): Promise<{ success: boolean; orderId: string; status: string }> => {
  // Use server-side API for order creation to ensure security/logging
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  
  if (!response.ok) throw new Error('Failed to create order');
  return response.json();
};
