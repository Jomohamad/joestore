import { Game, Package, Promotion, Order } from '../types';
import { supabase } from '../lib/supabase';

const getFallbackPromotions = (): Promotion[] => [
  {
    id: 1,
    subtitle_en: 'Get 20% extra Diamonds on Free Fire',
    subtitle_ar: 'احصل على 20% جواهر إضافية في فري فاير',
    image_url: 'https://picsum.photos/seed/gaming1/1200/600',
    is_active: true,
    sort_order: 1
  },
  {
    id: 2,
    subtitle_en: 'Exclusive skins available now',
    subtitle_ar: 'سكنات حصرية متوفرة الآن',
    image_url: 'https://picsum.photos/seed/gaming2/1200/600',
    is_active: true,
    sort_order: 2
  },
  {
    id: 3,
    subtitle_en: 'Save big on all App Subscriptions',
    subtitle_ar: 'وفر الكثير على جميع اشتراكات التطبيقات',
    image_url: 'https://picsum.photos/seed/gaming3/1200/600',
    is_active: true,
    sort_order: 3
  }
];

export const fetchPromotions = async (): Promise<Promotion[]> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
      
    if (error) {
      console.warn('Supabase error fetching promotions (using fallback):', error.message);
      return getFallbackPromotions();
    }
    
    return data && data.length > 0 ? data : getFallbackPromotions();
  } catch (error) {
    console.warn('Error fetching promotions (using fallback):', error);
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
    currency_icon: '💎',
    color_theme: 'from-orange-500 to-red-500',
    category: 'game',
    genre: 'Battle Royale',
    popularity: 100,
    min_price: 0.99
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    publisher: 'Tencent',
    image_url: 'https://picsum.photos/seed/pubg/800/600',
    currency_name: 'UC',
    currency_icon: '🪙',
    color_theme: 'from-yellow-500 to-orange-500',
    category: 'game',
    genre: 'Battle Royale',
    popularity: 95,
    min_price: 0.99
  },
  {
    id: 'netflix',
    name: 'Netflix',
    publisher: 'Netflix Inc.',
    image_url: 'https://picsum.photos/seed/netflix/800/600',
    currency_name: 'Subscription',
    currency_icon: '📺',
    color_theme: 'from-red-600 to-red-900',
    category: 'app',
    genre: 'Entertainment',
    popularity: 90,
    min_price: 9.99
  }
];

const getFallbackPackages = (gameId: string): Package[] => [
  { id: 1, game_id: gameId, amount: 100, bonus: 10, price: 0.99 },
  { id: 2, game_id: gameId, amount: 310, bonus: 31, price: 2.99 },
  { id: 3, game_id: gameId, amount: 520, bonus: 52, price: 4.99 },
  { id: 4, game_id: gameId, amount: 1060, bonus: 106, price: 9.99 },
];

export const fetchGames = async (): Promise<Game[]> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*');
      
    if (error) {
      console.warn('Supabase error fetching games (using fallback):', error.message);
      return getFallbackGames();
    }
    
    return data && data.length > 0 ? data : getFallbackGames();
  } catch (error) {
    console.warn('Error fetching games (using fallback):', error);
    return getFallbackGames();
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
      console.warn('Supabase error fetching game details (using fallback):', error.message);
      const game = getFallbackGames().find(g => g.id === id);
      if (game) return game;
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.warn('Error fetching game details (using fallback):', error);
    const game = getFallbackGames().find(g => g.id === id);
    if (game) return game;
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
      console.warn('Supabase error fetching packages (using fallback):', error.message);
      return getFallbackPackages(id);
    }
    
    return data && data.length > 0 ? data : getFallbackPackages(id);
  } catch (error) {
    console.warn('Error fetching packages (using fallback):', error);
    return getFallbackPackages(id);
  }
};

export const fetchWishlist = async (userId: string): Promise<{ game_id: string; package_id?: number }[]> => {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('game_id, package_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return [];
  }
};

export const addToWishlistApi = async (userId: string, gameId: string, packageId?: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('wishlist')
      .insert([{ user_id: userId, game_id: gameId, package_id: packageId }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

export const removeFromWishlistApi = async (userId: string, gameId: string, packageId?: number): Promise<void> => {
  try {
    let query = supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', gameId);
      
    if (packageId) {
      query = query.eq('package_id', packageId);
    } else {
      query = query.is('package_id', null);
    }

    const { error } = await query;

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

export const createOrder = async (orderData: {
  gameId: string;
  packageId: number;
  amount: number;
}): Promise<{ success: boolean; orderId: string; status: string }> => {
  const { data: { session } } = await supabase.auth.getSession();

  // Use server-side API for order creation to ensure security/logging
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(orderData),
  });
  
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
