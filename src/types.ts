export interface Game {
  id: string;
  name: string;
  publisher: string;
  image_url: string;
  currency_name: string;
  currency_icon: string;
  color_theme: string;
}

export interface Package {
  id: number;
  game_id: string;
  amount: number;
  bonus: number;
  price: number;
}

export interface Order {
  id: string;
  game_id: string;
  package_id: number;
  player_id: string;
  amount: number;
  status: string;
  created_at: string;
}
