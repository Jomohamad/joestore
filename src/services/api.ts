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

export const getAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const registerWithBackendApi = async (payload: {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}): Promise<{
  user: { id: string; email: string; username: string; created_at: string } | null;
  requiresEmailConfirmation: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
}> => {
  const response = await fetchWithTimeout(
    '/api/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    12000,
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || body?.message || 'Registration failed'));
  }

  return {
    user: body?.user || null,
    requiresEmailConfirmation: Boolean(body?.requiresEmailConfirmation),
    accessToken: body?.accessToken || null,
    refreshToken: body?.refreshToken || null,
  };
};

export const loginWithBackendApi = async (payload: {
  email: string;
  password: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; username: string; created_at: string };
}> => {
  const response = await fetchWithTimeout(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    12000,
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || body?.message || 'Login failed'));
  }

  if (!body?.accessToken || !body?.refreshToken) {
    throw new Error('Missing auth session tokens');
  }

  return {
    accessToken: String(body.accessToken),
    refreshToken: String(body.refreshToken),
    user: body.user,
  };
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
  paymentMethod: 'fawaterk' | 'wallet' | 'card' | 'paypal';
  accountIdentifier: string;
  paymentDetails: Record<string, unknown>;
  packageName?: string;
  server?: string;
}): Promise<{ orderId: string; checkoutUrl: string; status: string; paymentReference?: string }> => {
  const authHeaders = await getAuthHeaders();

  const response = await fetchWithTimeout('/api/orders/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(orderData),
  }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to create order'));
  }

  return {
    orderId: String(body?.orderId || ''),
    checkoutUrl: String(body?.checkoutUrl || ''),
    status: String(body?.status || 'pending'),
    paymentReference: body?.paymentReference ? String(body.paymentReference) : undefined,
  };
};

export const fetchOrders = async (_userId?: string): Promise<Order[]> => {
  const authHeaders = await getAuthHeaders();
  try {
    const response = await fetchWithTimeout(
      '/api/orders/user',
      {
        headers: authHeaders,
      },
      10000,
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as Order[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching orders from API, fallback to Supabase:', error);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return [];
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return data || [];
  }
};

export const verifyPaymentCallbackApi = async (
  provider: 'fawaterk',
  payload: Record<string, unknown>,
): Promise<{ success: boolean; orderId: string; status: string }> => {
  const response = await fetchWithTimeout(
    `/api/payment/${provider}/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    12000,
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Payment verification failed'));
  }

  return {
    success: Boolean(body?.success),
    orderId: String(body?.orderId || ''),
    status: String(body?.status || ''),
  };
};

export const completeHostedCheckoutInSandbox = async (checkoutUrl: string) => {
  const parsed = new URL(checkoutUrl, window.location.origin);
  const pathname = parsed.pathname.toLowerCase();
  if (!pathname.startsWith('/payment/callback/')) {
    return false;
  }

  const provider = pathname.includes('/fawaterk') ? 'fawaterk' : null;
  if (!provider) return false;

  const payload: Record<string, unknown> = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    payload[key] = value;
  }

  await verifyPaymentCallbackApi(provider, payload);
  return true;
};

export const fetchAdminOrders = async (search = ''): Promise<Order[]> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`/api/admin/orders?search=${encodeURIComponent(search)}`, { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch admin orders'));
  return Array.isArray(body) ? body : [];
};

export const retryAdminOrder = async (orderId: string): Promise<Order> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/orders/retry',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to retry order'));
  return (body?.order || null) as Order;
};

export const fetchAdminGames = async (): Promise<Game[]> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/games', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch games'));
  return Array.isArray(body) ? body : [];
};

export const upsertAdminGame = async (payload: {
  id?: string;
  name: string;
  provider_api: 'reloadly' | 'gamesdrop';
  active: boolean;
}): Promise<Game> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/games',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to save game'));
  return body as Game;
};

export const fetchAdminProducts = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/products', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch products'));
  return Array.isArray(body) ? body : [];
};

export const upsertAdminProduct = async (payload: {
  id?: string;
  game_id: string;
  name: string;
  provider_product_id: string;
  price: number;
  currency: string;
  active: boolean;
  provider?: 'reloadly' | 'gamesdrop';
  image?: string | null;
}): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/products',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to save product'));
  return (body || {}) as Record<string, unknown>;
};

export const fetchAdminPayments = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/payments', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch payments'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminLogs = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/logs', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch logs'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminTransactions = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/transactions', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch transactions'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminUsers = async (search = ''): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`/api/admin/users?search=${encodeURIComponent(search)}`, { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch users'));
  return Array.isArray(body) ? body : [];
};

export const updateAdminUserRole = async (userId: string, role: 'admin' | 'user'): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/users',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ userId, role }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to update user role'));
  return (body || {}) as Record<string, unknown>;
};

export const setAdminOrderStatus = async (
  orderId: string,
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'failed',
): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/orders/status',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId, status }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to update order status'));
  return (body?.order || body || {}) as Record<string, unknown>;
};

export const deleteAdminProduct = async (productId: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/products',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ id: productId }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to delete product'));
};

export const subscribeToUserOrders = async (
  userId: string,
  onStatusUpdated: (payload: {
    orderId: string;
    status: 'pending' | 'paid' | 'processing' | 'completed' | 'failed';
    transactionId?: string | null;
    updatedAt: string;
    message?: string;
  }) => void,
) => {
  const channel = supabase
    .channel(`orders:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const next = payload.new as Record<string, unknown>;
        onStatusUpdated({
          orderId: String(next.id || ''),
          status: String(next.status || 'pending') as 'pending' | 'paid' | 'processing' | 'completed' | 'failed',
          transactionId: next.transaction_id ? String(next.transaction_id) : null,
          updatedAt: new Date().toISOString(),
          message: `Order status changed to ${String(next.status || '').toUpperCase()}`,
        });
      },
    )
    .subscribe();

  return {
    disconnect: () => {
      void supabase.removeChannel(channel);
    },
  };
};

export const deleteAccountApi = async (username: string) => {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/user/delete',
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ username }),
    },
    10000,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(String(body?.error || 'Failed to delete account'));
  }

  return response.json();
};

export const getSocketAuthToken = getAccessToken;
