import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';
import { Game } from '../types';

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
  const [language, setLanguage] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Game[]>(() => {
    const savedWishlist = localStorage.getItem('wishlist');
    return savedWishlist ? JSON.parse(savedWishlist) : [];
  });

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

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

  const addToWishlist = (game: Game) => {
    setWishlist(prev => {
      if (prev.some(item => item.id === game.id)) return prev;
      return [...prev, game];
    });
  };

  const removeFromWishlist = (gameId: string) => {
    setWishlist(prev => prev.filter(item => item.id !== gameId));
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
