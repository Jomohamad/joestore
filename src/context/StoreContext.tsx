import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';
import { Game, Package } from '../types';
import { useAuth } from './AuthContext';
import { fetchWishlist, addToWishlistApi, removeFromWishlistApi, fetchGames, fetchGamePackages } from '../services/api';
import { useNavigate } from 'react-router-dom';

type Language = 'en' | 'ar';

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
  playerId?: string;
  playerName?: string;
}

export interface WishlistItem {
  game: Game;
  package?: Package;
}

interface StoreContextType {
  language: Language;
  toggleLanguage: () => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  wishlist: WishlistItem[];
  addToWishlist: (game: Game, pkg?: Package) => void;
  removeFromWishlist: (gameId: string, packageId?: number) => void;
  isInWishlist: (gameId: string, packageId?: number) => boolean;
  t: (key: keyof typeof translations['en']) => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);

  // Load all games and packages for context
  useEffect(() => {
    const loadData = async () => {
      try {
        const games = await fetchGames();
        setAllGames(games);
        
        // In a real app, fetching all packages might be heavy. 
        // For now, we'll fetch them on demand or assume we have them if needed.
        // Or better, fetch packages for games in wishlist.
      } catch (error) {
        console.error('Failed to load games for wishlist context', error);
      }
    };
    loadData();
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

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const addToCart = (item: CartItem) => {
    if (!user) {
      alert(language === 'ar' ? 'يجب تسجيل الدخول لإضافة منتجات للسلة' : 'You must be logged in to add items to cart');
      return;
    }
    setCart(prev => [...prev, item]);
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
      cart, 
      addToCart, 
      removeFromCart, 
      updateCartItem,
      clearCart, 
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
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
