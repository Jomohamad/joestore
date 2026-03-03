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
  show_on_home?: boolean;
}

export interface Package {
  id: number;
  game_id: string;
  amount: number;
  bonus: number;
  price: number;
  image_url?: string | null;
}

export interface Order {
  id: string;
  game_id: string;
  package_id: number;
  amount: number;
  status: string;
  created_at: string;
}
