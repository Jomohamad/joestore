import { Game, Package } from '../types';

export const fetchGames = async (): Promise<Game[]> => {
  try {
    const response = await fetch('/api/games');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch games:', response.status, errorText);
      throw new Error(`Failed to fetch games: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('API Error (fetchGames):', error);
    throw error;
  }
};

export const fetchGameDetails = async (id: string): Promise<Game> => {
  const response = await fetch(`/api/games/${id}`);
  if (!response.ok) throw new Error('Failed to fetch game details');
  return response.json();
};

export const fetchGamePackages = async (id: string): Promise<Package[]> => {
  const response = await fetch(`/api/games/${id}/packages`);
  if (!response.ok) throw new Error('Failed to fetch packages');
  return response.json();
};

export const verifyPlayerId = async (gameId: string, playerId: string): Promise<{ valid: boolean; playerName?: string; error?: string }> => {
  const response = await fetch('/api/verify-player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameId, playerId }),
  });
  
  if (!response.ok) throw new Error('Verification failed');
  return response.json();
};

export const createOrder = async (orderData: {
  gameId: string;
  packageId: number;
  playerId: string;
  amount: number;
}): Promise<{ success: boolean; orderId: string; status: string }> => {
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
