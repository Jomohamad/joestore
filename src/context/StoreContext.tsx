import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';
import { Game, Package } from '../types';
import { useAuth } from './AuthContext';
import { fetchWishlist, addToWishlistApi, removeFromWishlistApi, fetchGames, fetchGamePackages } from '../services/api';

type Language = 'en' | 'ar';
type Currency = 'USD' | 'EGP';

export interface CartItem {
  id: string;
  gameId: string;
  gameName: string;
  gameImage: string;
  packageId: string;
  packageName: string;
  amount: number;
  currency: string;
  price: number;
}

export interface WishlistItem {
  game: Game;
  package?: Package;
}

interface StoreContextType {
  language: Language;
  toggleLanguage: () => void;
  currency: Currency;
  toggleCurrency: () => void;
  formatPrice: (priceInUSD: number) => string;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  wishlist: WishlistItem[];
  allGames: Game[];
  addToWishlist: (game: Game, pkg?: Package) => void;
  removeFromWishlist: (gameId: string, packageId?: number) => void;
  isInWishlist: (gameId: string, packageId?: number) => boolean;
  
  // order notification toast
  orderToast: { orderId: string } | null;
  notifyOrder: (order: { orderId: string }) => void;
  clearOrderToast: () => void;

  t: (key: keyof typeof translations['en']) => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [egpRate, setEgpRate] = useState<number>(50); // Default fallback
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [orderToast, setOrderToast] = useState<{ orderId: string } | null>(null);

  // Load all games and packages for context
  useEffect(() => {
    const loadData = async () => {
      try {
        const games = await fetchGames();
        setAllGames(games);
      } catch (error) {
        console.error('Failed to load games for wishlist context', error);
      }
    };
    
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        if (data.rates && data.rates.EGP) {
          setEgpRate(data.rates.EGP);
          console.log(`Exchange rate updated: 1 USD = ${data.rates.EGP} EGP`);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate, using fallback', error);
      }
    };

    loadData();
    fetchExchangeRate();
  }, []);

  // Sync wishlist with Supabase when user changes
  useEffect(() => {
    const syncWishlist = async () => {
      if (user && allGames.length > 0) {
        // Fetch wishlist items (game_id, package_id)
        // This part needs update in api.ts to return package_id too
        // For now, assuming fetchWishlist returns objects { game_id, package_id }
        // We need to update api.ts first to support this properly.
        // Let's assume we will update api.ts to return full objects.
        const wishlistData = await fetchWishlist(user.id); 
        
        const items: WishlistItem[] = [];
        for (const item of wishlistData) {
           const game = allGames.find(g => g.id === item.game_id);
           if (game) {
             // If package_id exists, we might need to fetch that package details if not available
             // For simplicity, we'll just store game for now if package fetching is complex here
             // But user wants specific product.
             // We will implement a basic version where we store the ID and fetch details in Wishlist page
             // Or fetch here.
             let pkg: Package | undefined;
             if (item.package_id) {
                // Fetch package details - this is N+1 but okay for small wishlist
                const pkgs = await fetchGamePackages(game.id);
                pkg = pkgs.find(p => p.id === item.package_id);
             }
             items.push({ game, package: pkg });
           }
        }
        setWishlist(items);
      } else {
        setWishlist([]);
      }
    };

    syncWishlist();
  }, [user, allGames]);

  // Auto-detect language
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'ar') {
      setLanguage('ar');
    } else {
      setLanguage('en');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // real‑time subscription for new orders (useful for live notifications)
  useEffect(() => {
    // NOTE: realtime subscription removed — implementation varies between
    // Supabase client versions and caused TypeScript type errors here.
    // If you want live order toasts, re-add using the project's Supabase
    // client's realtime API (e.g. `supabase.channel(...).on(...)` for v2).
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'USD' ? 'EGP' : 'USD');
  };

  const formatPrice = (priceInUSD: number) => {
    if (currency === 'EGP') {
      return `EGP ${(priceInUSD * egpRate).toFixed(2)}`;
    }
    return `$${priceInUSD.toFixed(2)}`;
  };

  const notifyOrder = (order: { orderId: string }) => {
    setOrderToast(order);
    setTimeout(() => setOrderToast(null), 4000);
  };

  const clearOrderToast = () => setOrderToast(null);

  const addToCart = (item: CartItem) => {
    if (!user) {
      alert(language === 'ar' ? 'يجب تسجيل الدخول لإضافة منتجات للسلة' : 'You must be logged in to add items to cart');
      return;
    }
    setCart(prev => {
      // if the same game/package already exists, increment amount and update price
      const existing = prev.find(i => i.gameId === item.gameId && i.packageId === item.packageId);
      if (existing) {
        return prev.map(i => {
          if (i === existing) {
            return {
              ...i,
              amount: i.amount + item.amount,
              price: i.price + item.price,
            };
          }
          return i;
        });
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const clearCart = () => {
    setCart([]);
  };

  const addToWishlist = async (game: Game, pkg?: Package) => {
    if (!user) {
      alert(language === 'ar' ? 'يجب تسجيل الدخول لإضافة منتجات للمفضلة' : 'You must be logged in to add items to wishlist');
      return;
    }

    // Optimistic update
    setWishlist(prev => {
      if (prev.some(item => item.game.id === game.id && item.package?.id === pkg?.id)) return prev;
      return [...prev, { game, package: pkg }];
    });

    try {
      await addToWishlistApi(user.id, game.id, pkg?.id);
    } catch (error) {
      // Revert on error
      setWishlist(prev => prev.filter(item => !(item.game.id === game.id && item.package?.id === pkg?.id)));
      console.error('Failed to add to wishlist', error);
    }
  };

  const removeFromWishlist = async (gameId: string, packageId?: number) => {
    if (!user) return;

    // Optimistic update
    const previousWishlist = [...wishlist];
    setWishlist(prev => prev.filter(item => !(item.game.id === gameId && item.package?.id === packageId)));

    try {
      await removeFromWishlistApi(user.id, gameId, packageId);
    } catch (error) {
      // Revert on error
      setWishlist(previousWishlist);
      console.error('Failed to remove from wishlist', error);
    }
  };

  const isInWishlist = (gameId: string, packageId?: number) => {
    return wishlist.some(item => item.game.id === gameId && item.package?.id === packageId);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  return (
    <StoreContext.Provider value={{ 
      language, 
      toggleLanguage, 
      currency,
      toggleCurrency,
      formatPrice,
      cart, 
      addToCart, 
      removeFromCart, 
      updateCartItem,
      clearCart, 
      wishlist,
      allGames,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      orderToast,
      notifyOrder,
      clearOrderToast,
      t 
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
