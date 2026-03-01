import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';
import { Game } from '../types';
import { useAuth } from './AuthContext';
import { fetchWishlist, addToWishlistApi, removeFromWishlistApi, fetchGames } from '../services/api';

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
  playerId: string;
  playerName?: string;
}

interface StoreContextType {
  language: Language;
  toggleLanguage: () => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  wishlist: Game[];
  addToWishlist: (game: Game) => void;
  removeFromWishlist: (gameId: string) => void;
  isInWishlist: (gameId: string) => boolean;
  t: (key: keyof typeof translations['en']) => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Game[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);

  // Load all games once to map wishlist IDs to Game objects
  useEffect(() => {
    const loadGames = async () => {
      try {
        const games = await fetchGames();
        setAllGames(games);
      } catch (error) {
        console.error('Failed to load games for wishlist context', error);
      }
    };
    loadGames();
  }, []);

  // Sync wishlist with Supabase when user changes
  useEffect(() => {
    const syncWishlist = async () => {
      if (user && allGames.length > 0) {
        const wishlistIds = await fetchWishlist(user.id);
        const userWishlist = allGames.filter(game => wishlistIds.includes(game.id));
        setWishlist(userWishlist);
      } else if (!user) {
        // Fallback to localStorage for guest users
        const savedWishlist = localStorage.getItem('wishlist');
        setWishlist(savedWishlist ? JSON.parse(savedWishlist) : []);
      }
    };

    syncWishlist();
  }, [user, allGames]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Persist to localStorage only for guest users
  useEffect(() => {
    if (!user) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, user]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const addToWishlist = async (game: Game) => {
    // Optimistic update
    setWishlist(prev => {
      if (prev.some(item => item.id === game.id)) return prev;
      return [...prev, game];
    });

    if (user) {
      try {
        await addToWishlistApi(user.id, game.id);
      } catch (error) {
        // Revert on error
        setWishlist(prev => prev.filter(item => item.id !== game.id));
        console.error('Failed to add to wishlist', error);
      }
    }
  };

  const removeFromWishlist = async (gameId: string) => {
    // Optimistic update
    const previousWishlist = [...wishlist];
    setWishlist(prev => prev.filter(item => item.id !== gameId));

    if (user) {
      try {
        await removeFromWishlistApi(user.id, gameId);
      } catch (error) {
        // Revert on error
        setWishlist(previousWishlist);
        console.error('Failed to remove from wishlist', error);
      }
    }
  };

  const isInWishlist = (gameId: string) => {
    return wishlist.some(item => item.id === gameId);
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
