import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '../translations';
import { Game } from '../types';
import { useAuth } from './AuthContext';
import { addToWishlistApi, fetchGames, fetchWishlist, removeFromWishlistApi } from '../services/api';

type Language = 'en' | 'ar';
type Currency = 'USD' | 'EGP';

export interface CartItem {
  id: string;
  gameId: string;
  gameName: string;
  gameImage: string;
  packageId: number;
  packageName: string;
  packageAmount: number;
  quantity: number;
  currency: string;
  unitPrice: number;
  totalPrice: number;
  packageImage?: string | null;
}

export interface WishlistItem {
  game: Game;
}

interface StoreContextType {
  language: Language;
  toggleLanguage: () => void;
  currency: Currency;
  toggleCurrency: () => void;
  formatPrice: (priceInUSD: number) => string;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'id' | 'quantity' | 'totalPrice'> & { quantity?: number }) => void;
  removeFromCart: (id: string) => void;
  setCartQuantity: (gameId: string, packageId: number, quantity: number) => void;
  incrementCartItem: (gameId: string, packageId: number) => void;
  decrementCartItem: (gameId: string, packageId: number) => void;
  getCartQuantity: (gameId: string, packageId: number) => number;
  clearCart: () => void;
  wishlist: WishlistItem[];
  allGames: Game[];
  addToWishlist: (game: Game) => void;
  removeFromWishlist: (gameId: string) => void;
  isInWishlist: (gameId: string) => boolean;
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
  const [egpRate, setEgpRate] = useState<number>(50);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [orderToast, setOrderToast] = useState<{ orderId: string } | null>(null);

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
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate, using fallback', error);
      }
    };

    loadData();
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    const syncWishlist = async () => {
      if (user && allGames.length > 0) {
        const wishlistData = await fetchWishlist(user.id);

        const items: WishlistItem[] = [];
        for (const item of wishlistData) {
          const game = allGames.find((g) => g.id === item.game_id);
          if (game) {
            items.push({ game });
          }
        }
        setWishlist(items);
      } else {
        setWishlist([]);
      }
    };

    syncWishlist();
  }, [user, allGames]);

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    setLanguage(browserLang === 'ar' ? 'ar' : 'en');
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === 'USD' ? 'EGP' : 'USD'));
  };

  const formatPrice = (priceInUSD: number) => {
    if (currency === 'EGP') return `EGP ${(priceInUSD * egpRate).toFixed(2)}`;
    return `$${priceInUSD.toFixed(2)}`;
  };

  const notifyOrder = (order: { orderId: string }) => {
    setOrderToast(order);
    setTimeout(() => setOrderToast(null), 4000);
  };

  const clearOrderToast = () => setOrderToast(null);

  const setCartQuantity = (gameId: string, packageId: number, quantity: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.gameId === gameId && item.packageId === packageId);
      if (idx === -1) return prev;

      if (quantity <= 0) {
        return prev.filter((item) => !(item.gameId === gameId && item.packageId === packageId));
      }

      return prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              quantity,
              totalPrice: item.unitPrice * quantity,
            }
          : item,
      );
    });
  };

  const incrementCartItem = (gameId: string, packageId: number) => {
    const current = cart.find((item) => item.gameId === gameId && item.packageId === packageId);
    if (!current) return;
    setCartQuantity(gameId, packageId, current.quantity + 1);
  };

  const decrementCartItem = (gameId: string, packageId: number) => {
    const current = cart.find((item) => item.gameId === gameId && item.packageId === packageId);
    if (!current) return;
    setCartQuantity(gameId, packageId, current.quantity - 1);
  };

  const getCartQuantity = (gameId: string, packageId: number) => {
    return cart.find((item) => item.gameId === gameId && item.packageId === packageId)?.quantity || 0;
  };

  const addToCart = (item: Omit<CartItem, 'id' | 'quantity' | 'totalPrice'> & { quantity?: number }) => {
    if (!user) {
      alert(language === 'ar' ? 'يجب تسجيل الدخول لإضافة منتجات للسلة' : 'You must be logged in to add items to cart');
      return;
    }

    const quantityToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;

    setCart((prev) => {
      const existing = prev.find((i) => i.gameId === item.gameId && i.packageId === item.packageId);
      if (existing) {
        return prev.map((i) =>
          i.gameId === item.gameId && i.packageId === item.packageId
            ? {
                ...i,
                quantity: i.quantity + quantityToAdd,
                totalPrice: i.unitPrice * (i.quantity + quantityToAdd),
              }
            : i,
        );
      }

      const id = `${item.gameId}:${item.packageId}`;
      return [
        ...prev,
        {
          ...item,
          id,
          quantity: quantityToAdd,
          totalPrice: item.unitPrice * quantityToAdd,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const addToWishlist = async (game: Game) => {
    if (!user) {
      alert(language === 'ar' ? 'يجب تسجيل الدخول لإضافة منتجات للمفضلة' : 'You must be logged in to add items to wishlist');
      return;
    }

    setWishlist((prev) => {
      if (prev.some((item) => item.game.id === game.id)) return prev;
      return [...prev, { game }];
    });

    try {
      await addToWishlistApi(user.id, game.id);
    } catch (error) {
      setWishlist((prev) => prev.filter((item) => item.game.id !== game.id));
      console.error('Failed to add to wishlist', error);
    }
  };

  const removeFromWishlist = async (gameId: string) => {
    if (!user) return;

    const previousWishlist = [...wishlist];
    setWishlist((prev) => prev.filter((item) => item.game.id !== gameId));

    try {
      await removeFromWishlistApi(user.id, gameId);
    } catch (error) {
      setWishlist(previousWishlist);
      console.error('Failed to remove from wishlist', error);
    }
  };

  const isInWishlist = (gameId: string) => {
    return wishlist.some((item) => item.game.id === gameId);
  };

  const t = (key: keyof typeof translations['en']) => translations[language][key] || key;

  return (
    <StoreContext.Provider
      value={{
        language,
        toggleLanguage,
        currency,
        toggleCurrency,
        formatPrice,
        cart,
        addToCart,
        removeFromCart,
        setCartQuantity,
        incrementCartItem,
        decrementCartItem,
        getCartQuantity,
        clearCart,
        wishlist,
        allGames,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        orderToast,
        notifyOrder,
        clearOrderToast,
        t,
      }}
    >
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
