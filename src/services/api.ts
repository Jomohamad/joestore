import { Game, Package } from '../types';

export const fetchGames = async (): Promise<Game[]> => {
  const response = await fetch('/api/games');
  if (!response.ok) throw new Error('Failed to fetch games');
  return response.json();
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
