import { Game, Package, Promotion, Order } from '../types';
import { supabase } from '../lib/supabase';

const API_TIMEOUT_MS = 2500;

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchJsonWithTimeout = async <T>(url: string, timeoutMs = API_TIMEOUT_MS): Promise<T> => {
  const response = await fetchWithTimeout(url, undefined, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const getFallbackPromotions = (): Promotion[] => [
  {
    id: 1,
    image_url: 'https://picsum.photos/seed/gaming1/1200/600',
    is_active: true,
    sort_order: 1
  },
  {
    id: 2,
    image_url: 'https://picsum.photos/seed/gaming2/1200/600',
    is_active: true,
    sort_order: 2
  },
  {
    id: 3,
    image_url: 'https://picsum.photos/seed/gaming3/1200/600',
    is_active: true,
    sort_order: 3
  }
];

export const fetchPromotions = async (): Promise<Promotion[]> => {
  try {
    const data = await fetchJsonWithTimeout<Promotion[]>('/api/promotions');
    return data && data.length > 0 ? data : getFallbackPromotions();
  } catch (error) {
    console.warn('Error fetching promotions from API (using fallback):', error);
    return getFallbackPromotions();
  }
};

const getFallbackGames = (): Game[] => [
  {
    id: 'freefire',
    name: 'Free Fire',
    publisher: 'Garena',
    image_url: 'https://picsum.photos/seed/ff/800/600',
    currency_name: 'Diamonds',
    category: 'game',
    show_on_home: true
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    publisher: 'Tencent',
    image_url: 'https://picsum.photos/seed/pubg/800/600',
    currency_name: 'UC',
    category: 'game',
    show_on_home: true
  },
  {
    id: 'netflix',
    name: 'Netflix',
    publisher: 'Netflix Inc.',
    image_url: 'https://picsum.photos/seed/netflix/800/600',
    currency_name: 'Subscription',
    category: 'app',
    show_on_home: true
  }
];

export const fetchGames = async (): Promise<Game[]> => {
  try {
    const data = await fetchJsonWithTimeout<Game[]>('/api/games');
    return data && data.length > 0 ? data : getFallbackGames();
  } catch (error) {
    console.warn('Error fetching games from API (using fallback):', error);
    return getFallbackGames();
  }
};

export const fetchGameDetails = async (id: string): Promise<Game> => {
  try {
    const data = await fetchJsonWithTimeout<Game>(`/api/games/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    console.warn('Error fetching game details from API (using fallback):', error);
    const game = getFallbackGames().find(g => g.id === id);
    if (game) return game;
    throw error;
  }
};

export const fetchGamePackages = async (id: string): Promise<Package[]> => {
  try {
    const data = await fetchJsonWithTimeout<Package[]>(`/api/games/${encodeURIComponent(id)}/packages`);
    return data || [];
  } catch (error) {
    console.warn('Error fetching packages from API:', error);
    return [];
  }
};

export const fetchWishlist = async (userId: string): Promise<{ game_id: string }[]> => {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('game_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
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

export const validateCoupon = async (code: string): Promise<{ valid: boolean; discountType?: 'percent' | 'fixed'; value?: number; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    if (!data.active) {
      return { valid: false, error: 'Coupon is expired or inactive' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'Coupon is expired' };
    }

    return { 
      valid: true, 
      discountType: data.discount_type, 
      value: data.value 
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { valid: false, error: 'Error validating coupon' };
  }
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
};

export const fetchProfileStatus = async (): Promise<{
  exists: boolean;
  onboarded: boolean;
  profile?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    avatar_url?: string | null;
    provider_avatar_url?: string | null;
    is_admin?: boolean;
  };
}> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/profile/status', { headers }, 5000);
  if (!response.ok) {
    throw new Error('Failed to fetch profile status');
  }
  return response.json();
};

export const completeProfileApi = async (payload: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl?: string;
  providerAvatarUrl?: string;
}): Promise<{ success: boolean; profile: unknown }> => {
  const fallbackClientUpdate = async () => {
    const { data: userData, error } = await supabase.auth.updateUser({
      data: {
        first_name: payload.firstName,
        last_name: payload.lastName,
        username: payload.username,
        avatar_url: payload.avatarUrl || null,
        provider_avatar_url: payload.providerAvatarUrl || null,
        email: payload.email,
        onboarded: true,
      },
    });

    if (error) throw error;

    return {
      success: true,
      profile: {
        id: userData.user?.id,
        email: userData.user?.email || payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        username: payload.username,
        avatar_url: payload.avatarUrl || null,
        provider_avatar_url: payload.providerAvatarUrl || null,
        onboarded: true,
      },
    };
  };

  const headers = await getAuthHeaders();
  try {
    const response = await fetchWithTimeout('/api/profile/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    }, 10000);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const errorMsg = String(data?.error || '');
      if (response.status >= 500 || errorMsg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        return fallbackClientUpdate();
      }
      throw new Error(errorMsg || 'Failed to complete profile');
    }

    return response.json();
  } catch {
    return fallbackClientUpdate();
  }
};

export const checkUsernameAvailabilityApi = async (
  username: string,
  token?: string,
): Promise<{ available: boolean; suggestions: string[]; error?: string }> => {
  const response = await fetchWithTimeout(`/api/check-username?username=${encodeURIComponent(username)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }, 5000);

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      available: false,
      suggestions: Array.isArray(payload?.suggestions) ? payload.suggestions : [],
      error: String(payload?.error || 'Username check failed'),
    };
  }

  return {
    available: Boolean(payload?.available),
    suggestions: Array.isArray(payload?.suggestions) ? payload.suggestions : [],
  };
};

export const createOrder = async (orderData: {
  gameId: string;
  packageId: number;
  amount: number;
  quantity: number;
  paymentMethod: 'fawry' | 'wallet' | 'card' | 'paypal';
  accountIdentifier: string;
  paymentDetails: Record<string, unknown>;
}): Promise<{ success: boolean; orderId: string; status: string }> => {
  const authHeaders = await getAuthHeaders();

  // Use server-side API for order creation to ensure security/logging
  const response = await fetchWithTimeout('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(orderData),
  }, 10000);
  
  if (!response.ok) throw new Error('Failed to create order');
  return response.json();
};

export const fetchOrders = async (userId: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching orders:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};
