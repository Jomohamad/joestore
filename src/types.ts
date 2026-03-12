export interface Promotion {
  [key: string]: any;
  id: number;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  sort_order: number;
  font_size_scale?: number;
}

export interface Game {
  [key: string]: any;
  id: string;
  slug?: string | null;
  name: string;
  publisher: string;
  image_url: string;
  currency_name: string;
  category: 'game' | 'app';
  description?: string | null;
  show_on_home?: boolean;
}

export interface Package {
  [key: string]: any;
  id: number;
  game_id: string;
  amount: number;
  bonus: number;
  price: number;
  image_url?: string | null;
  discount_type?: 'percent' | 'fixed' | null;
  discount_value?: number;
  discount_active?: boolean;
  discount_ends_at?: string | null;
}

export interface Order {
  [key: string]: any;
  id: string;
  user_id?: string | null;
  game_id: string;
  product_id?: string | null;
  package_id?: number | null;
  amount: number;
  currency?: string | null;
  price?: number | null;
  original_price?: number | null;
  discount_amount?: number | null;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_status?: string | null;
  account_identifier?: string | null;
  player_id?: string | null;
  server?: string | null;
  package?: string | null;
  provider?: string | null;
  payment_id?: string | null;
  payment_invoice_id?: string | null;
  transaction_id?: string | null;
  provider_order_ref?: string | null;
  provider_response?: Record<string, unknown> | null;
  payment_details?: Record<string, unknown>;
  quantity?: number;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
}

export interface UserProfile {
  [key: string]: any;
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url?: string | null;
  provider_avatar_url?: string | null;
  onboarded: boolean;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  [key: string]: any;
  id: string;
  order_id: string;
  provider: string;
  provider_tx_id?: string | null;
  provider_transaction_id?: string | null;
  response: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface Wallet {
  [key: string]: any;
  user_id: string;
  balance: number;
  currency: string;
  updated_at?: string | null;
}

export interface WalletTransaction {
  [key: string]: any;
  id: string;
  user_id: string;
  amount: number;
  type: 'credit' | 'debit';
  currency: string;
  source: string;
  reference_type?: string | null;
  reference_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  [key: string]: any;
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkerHeartbeat {
  [key: string]: any;
  id: string;
  worker_name: string;
  status: string;
  metadata: Record<string, unknown>;
  last_seen_at: string;
}

export interface AnalyticsEvent {
  [key: string]: any;
  id: string;
  user_id?: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
