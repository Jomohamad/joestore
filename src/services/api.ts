import { Game, Package, Promotion, Order, UserProfile, Transaction, WalletTransaction, AuditLog, WorkerHeartbeat, AnalyticsEvent } from '../types';
import { supabase } from '../lib/supabase';

export interface PricingRule {
  [key: string]: any;
  id: string;
  productId: string;
  marginPercent: number;
  minProfit?: number;
  maxProfit?: number;
}

export interface DiscountRule {
  [key: string]: any;
  id: string;
  scope: string;
  percent?: number;
  fixed_amount?: number;
  game_id?: string | null;
  category?: string | null;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_uses?: number | null;
  used_count: number;
}

const API_TIMEOUT_MS = 8000;
const isAbortLikeError = (error: unknown): boolean => {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  if (error instanceof Error) {
    return error.name === 'AbortError' || /aborted/i.test(error.message);
  }
  return false;
};

const fetchWithTimeout = async (url: string, init?: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout && isAbortLikeError(error)) {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
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
    if (!isAbortLikeError(error) && !(error instanceof Error && /timeout/i.test(error.message))) {
      console.warn('Error fetching promotions from API (using fallback):', error);
    }
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
    if (!isAbortLikeError(error) && !(error instanceof Error && /timeout/i.test(error.message))) {
      console.warn('Error fetching games from API (using fallback):', error);
    }
    return getFallbackGames();
  }
};

export const fetchGameDetails = async (id: string): Promise<Game> => {
  try {
    const data = await fetchJsonWithTimeout<Game>(`/api/games/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    if (!isAbortLikeError(error) && !(error instanceof Error && /timeout/i.test(error.message))) {
      console.warn('Error fetching game details from API (using fallback):', error);
    }
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
    if (!isAbortLikeError(error) && !(error instanceof Error && /timeout/i.test(error.message))) {
      console.warn('Error fetching packages from API:', error);
    }
    return [];
  }
};

export const fetchWishlist = async (userId: string): Promise<{ game_id: string }[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('wishlist')
      .select('game_id')
      .eq('user_id', userId)
      .limit(200);

    if (error) throw error;
    return (data as { game_id: string }[] | null) || [];
  } catch (error) {
    if (!isAbortLikeError(error) && !(error instanceof Error && /timeout/i.test(error.message))) {
      console.error('Error fetching wishlist:', error);
    }
    return [];
  }
};

export const addToWishlistApi = async (userId: string, gameId: string): Promise<void> => {
  try {
    const { error } = await (supabase as any)
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
    const { error } = await (supabase as any)
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
    const { data, error } = await (supabase as any)
      .from('coupons')
      .select('*')
      .eq('code', code)
      .single();

    const coupon = data as
      | {
          active?: boolean;
          expires_at?: string | null;
          discount_type?: 'percent' | 'fixed';
          value?: number;
        }
      | null;

    if (error || !coupon) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    if (!coupon.active) {
      return { valid: false, error: 'Coupon is expired or inactive' };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, error: 'Coupon is expired' };
    }

    return { 
      valid: true, 
      discountType: coupon.discount_type, 
      value: coupon.value 
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

export const requestPasswordResetApi = async (email: string): Promise<void> => {
  const response = await fetchWithTimeout(
    '/api/auth/password-reset',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    12000,
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || body?.message || 'Password reset failed'));
  }
};

export const resendConfirmationEmailApi = async (email: string): Promise<void> => {
  const response = await fetchWithTimeout(
    '/api/auth/resend-confirmation',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    12000,
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || body?.message || 'Resend confirmation failed'));
  }
};

export const logoutBackendApi = async (reason?: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/auth/logout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ reason }),
    },
    8000,
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || body?.message || 'Logout failed'));
  }
};

export const fetchProfileStatus = async (): Promise<{
  exists: boolean;
  onboarded: boolean;
  profile?: UserProfile;
}> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/profile/status', { headers }, 5000);
  
  // Handle 404/401/403 as user not existing or unauthorized (treated as not onboarded)
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return { exists: false, onboarded: false };
  }
  
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
}): Promise<{ success: boolean; profile: UserProfile }> => {
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
  paymentMethod: 'fawaterk' | 'wallet';
  accountIdentifier: string;
  paymentDetails: Record<string, unknown>;
  packageName?: string;
  server?: string;
  couponCode?: string;
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

export const checkoutCart = async (items: Array<{
  gameId: string;
  packageId: number;
  amount: number;
  quantity: number;
  paymentMethod: 'fawaterk' | 'wallet';
  accountIdentifier: string;
  packageName?: string;
  server?: string;
}>, couponCode?: string | null): Promise<{
  checkoutUrl: string | null;
  orders: Array<{ orderId: string; status: string; checkoutUrl?: string; paymentReference?: string }>;
  count: number;
}> => {
  const authHeaders = await getAuthHeaders();

  const response = await fetchWithTimeout('/api/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ items, couponCode }),
  }, 15000);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to checkout cart'));
  }

  const orders = Array.isArray(body?.orders) ? body.orders : [];
  return {
    checkoutUrl: body?.checkoutUrl ? String(body.checkoutUrl) : null,
    orders: orders.map((o: Record<string, unknown>) => ({
      orderId: String(o.orderId || ''),
      status: String(o.status || 'pending'),
      checkoutUrl: o.checkoutUrl ? String(o.checkoutUrl) : undefined,
      paymentReference: o.paymentReference ? String(o.paymentReference) : undefined,
    })),
    count: Number(body?.count || orders.length || 0),
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
    if (!isAbortLikeError(error) && !(error instanceof Error && /timeout/i.test(error.message))) {
      console.error('Error fetching orders from API, fallback to Supabase:', error);
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return [];
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    return data || [];
  }
};

export const fetchOrderEvents = async (orderId: string): Promise<Array<Record<string, unknown>>> => {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(`/api/orders/events?orderId=${encodeURIComponent(orderId)}`, { headers: authHeaders }, 8000);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to fetch order events'));
  }
  return Array.isArray(body) ? body : [];
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

export const fetchOrderStatusApi = async (orderId: string): Promise<{ orderId: string; status: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    `/api/orders/status?orderId=${encodeURIComponent(orderId)}`,
    { headers },
    8000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to fetch order status'));
  }

  return {
    orderId: String(body?.orderId || orderId),
    status: String(body?.status || 'pending'),
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

export const fetchWalletBalance = async (): Promise<{ balance: number; currency: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/wallet/balance', { headers }, 8000);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to fetch wallet balance'));
  }
  return {
    balance: Number(body?.balance || 0),
    currency: String(body?.currency || 'EGP'),
  };
};

export const fetchWalletTransactions = async (page = 1, limit = 50): Promise<Array<WalletTransaction>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`/api/wallet/transactions?page=${page}&limit=${limit}`, { headers }, 8000);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to fetch wallet transactions'));
  }
  return Array.isArray(body) ? body : [];
};

export const createWalletTopup = async (amount: number, currency = 'EGP'): Promise<{ topupId: string; checkoutUrl: string }> => {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/wallet/topup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ amount, currency }),
    },
    12000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to create wallet topup'));
  }

  return {
    topupId: String(body?.topupId || ''),
    checkoutUrl: String(body?.checkoutUrl || ''),
  };
};

export const fetchWalletTopupStatus = async (topupId: string): Promise<{ topupId: string; status: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    `/api/wallet/topup/status?topupId=${encodeURIComponent(topupId)}`,
    { headers },
    8000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(body?.error || 'Failed to fetch wallet topup status'));
  }
  return {
    topupId: String(body?.topupId || topupId),
    status: String(body?.status || 'pending'),
  };
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
  provider?: 'reloadly' | 'gamesdrop' | 'unipin' | 'seagm' | 'driffle';
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

export const fetchAdminLogs = async (): Promise<Array<AuditLog>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/logs', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch logs'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminTransactions = async (): Promise<Array<Transaction>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/transactions', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch transactions'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminUsers = async (search = ''): Promise<Array<UserProfile>> => {
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

export const fetchAdminProviderPrices = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/provider-prices', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch provider prices'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminProviderHealth = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/provider-health', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch provider health'));
  return Array.isArray(body) ? body : [];
};

export const updateAdminProviderHealth = async (payload: {
  provider: string;
  enabled?: boolean;
  priority?: number;
}): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/provider-health',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to update provider'));
  return (body || {}) as Record<string, unknown>;
};

export const fetchAdminFraudAlerts = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/fraud', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch fraud alerts'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminFraudSignals = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/fraud/signals', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch fraud signals'));
  return Array.isArray(body) ? body : [];
};

export const runAdminFraudAction = async (payload: {
  action: 'block_user' | 'flag_order' | 'reduce_risk';
  userId?: string;
  orderId?: string;
  riskDelta?: number;
}): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/fraud/actions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to apply fraud action'));
  return (body || {}) as Record<string, unknown>;
};

export const fetchAdminFailedOrders = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/orders/failed', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch failed orders'));
  return Array.isArray(body) ? body : [];
};

export const upsertAdminPricingRule = async (payload: {
  productId: string;
  marginPercent: number;
  minProfit?: number;
  maxProfit?: number;
}): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/pricing-rules',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to save pricing rule'));
  return (body || {}) as Record<string, unknown>;
};

export const fetchAdminPricingRules = async (): Promise<Array<PricingRule>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/pricing-rules', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch pricing rules'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminDiscountRules = async (): Promise<Array<DiscountRule>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/discount-rules', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch discount rules'));
  return Array.isArray(body) ? body : [];
};

export const createAdminDiscountRule = async (payload: {
  scope: string;
  percent?: number;
  fixed_amount?: number;
  game_id?: string | null;
  category?: string | null;
  active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_uses?: number | null;
}): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/discount-rules',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to create discount rule'));
  return body || {};
};

export const trackAnalyticsEvent = async (eventType: string, metadata?: Record<string, unknown>): Promise<void> => {
  const response = await fetchWithTimeout(
    '/api/analytics/track',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata: metadata || {} }),
    },
    4000,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(String(body?.error || 'Failed to track event'));
  }
};

export const fetchReferralCode = async (): Promise<{ code: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/referrals/code', { headers }, 8000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch referral code'));
  return { code: String(body?.code || '') };
};

export const claimReferralCode = async (code: string): Promise<{ claimed: boolean }> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/referrals/claim',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ code }),
    },
    8000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to claim referral code'));
  return { claimed: Boolean(body?.claimed) };
};

export const fetchAdminApiMonitor = async (): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/api-monitor', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch API monitor'));
  return (body || {}) as Record<string, unknown>;
};

export const fetchAdminMetrics = async (): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/metrics', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch metrics'));
  return body || {};
};

export const fetchAdminProviderSla = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/provider-sla', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch provider SLA'));
  return Array.isArray(body) ? body : [];
};

export const upsertAdminProviderSla = async (payload: {
  provider: string;
  target_success_rate: number;
  target_latency_ms: number;
  enabled?: boolean;
}): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/provider-sla',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to update provider SLA'));
  return body || {};
};

export const sendAdminTestAlert = async (): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/alerts/test',
    { method: 'POST', headers },
    8000,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(String(body?.error || 'Failed to send test alert'));
  }
};

export const fetchAdminAlerts = async (): Promise<Array<AuditLog>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/alerts', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch alerts'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminWorkers = async (): Promise<Array<WorkerHeartbeat>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/workers', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch workers'));
  return Array.isArray(body) ? body : [];
};

export const fetchAdminSettings = async (): Promise<Array<Record<string, unknown>>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout('/api/admin/settings', { headers }, 10000);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to fetch settings'));
  return Array.isArray(body) ? body : [];
};

export const updateAdminSetting = async (payload: {
  key: string;
  value: unknown;
  description?: string;
}): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to update setting'));
  return (body || {}) as Record<string, unknown>;
};

export const blockAdminUser = async (payload: { userId: string; blocked: boolean }): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/users/block',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to update user block status'));
  return (body || {}) as Record<string, unknown>;
};

export const refundAdminOrder = async (orderId: string): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/orders/refund',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to refund order'));
  return (body || {}) as Record<string, unknown>;
};

export const cancelAdminOrder = async (orderId: string): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/orders/cancel',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to cancel order'));
  return (body || {}) as Record<string, unknown>;
};

export const verifyAdminPayment = async (paymentId: string): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/payments/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ paymentId }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to verify payment'));
  return (body || {}) as Record<string, unknown>;
};

export const refundAdminPayment = async (paymentId: string): Promise<Record<string, unknown>> => {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/admin/payments/refund',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ paymentId }),
    },
    10000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(String(body?.error || 'Failed to refund payment'));
  return (body || {}) as Record<string, unknown>;
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
   const channelId =
     (globalThis.crypto?.randomUUID
       ? globalThis.crypto.randomUUID()
       : (() => {
           const randomBytes = new Uint8Array(3);
           crypto.getRandomValues(randomBytes);
           return Array.from(randomBytes, b => b.toString(36)).join('');
         })())
       .replace(/[^a-zA-Z0-9]/g, '');
  const channel = supabase
    .channel(`orders_updates_${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const next = payload.new as Record<string, unknown> | null;
        if (!next || typeof next !== 'object') return;
        const orderId = String(next.id || '').trim();
        const statusRaw = String(next.status || '').trim().toLowerCase();
        if (!orderId || !['pending', 'paid', 'processing', 'completed', 'failed'].includes(statusRaw)) {
          return;
        }
        onStatusUpdated({
          orderId,
          status: statusRaw as 'pending' | 'paid' | 'processing' | 'completed' | 'failed',
          transactionId: next.transaction_id ? String(next.transaction_id) : null,
          updatedAt: new Date().toISOString(),
          message: `Order status changed to ${statusRaw.toUpperCase()}`,
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
