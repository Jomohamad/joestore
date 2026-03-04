export interface Promotion {
  id: number;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  sort_order: number;
  font_size_scale?: number;
}

export interface Game {
  id: string;
  name: string;
  publisher: string;
  image_url: string;
  currency_name: string;
  category: 'game' | 'app';
  description?: string | null;
  show_on_home?: boolean;
}

export interface Package {
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
  id: string;
  game_id: string;
  package_id: number;
  amount: number;
  status: string;
  payment_method?: string | null;
  account_identifier?: string | null;
  payment_details?: Record<string, unknown>;
  quantity?: number;
  created_at: string;
}
