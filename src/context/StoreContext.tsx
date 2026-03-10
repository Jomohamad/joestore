import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { translations } from '../translations';
import { Game } from '../types';
import { useAuth } from './AuthContext';
import { addToWishlistApi, fetchGames, fetchWishlist, removeFromWishlistApi, subscribeToUserOrders } from '../services/api';

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
  accountIdentifier: string;
  quantity: number;
  currency: string;
  unitPrice: number;
  originalUnitPrice?: number;
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
  setCartQuantity: (gameId: string, packageId: number, accountIdentifier: string, quantity: number) => void;
  incrementCartItem: (gameId: string, packageId: number, accountIdentifier: string) => void;
  decrementCartItem: (gameId: string, packageId: number, accountIdentifier: string) => void;
  getCartQuantity: (gameId: string, packageId: number, accountIdentifier: string) => number;
  clearCart: () => void;
  wishlist: WishlistItem[];
  allGames: Game[];
  addToWishlist: (game: Game) => void;
  removeFromWishlist: (gameId: string) => void;
  isInWishlist: (gameId: string) => boolean;
  orderToast: { orderId: string; status?: string; message?: string } | null;
  notifyOrder: (order: { orderId: string; status?: string; message?: string }) => void;
  notifyMessage: (message: string) => void;
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
  const [orderToast, setOrderToast] = useState<{ orderId: string; status?: string; message?: string } | null>(null);
  const socketRef = useRef<Awaited<ReturnType<typeof subscribeToUserOrders>> | null>(null);

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

  const notifyOrder = (order: { orderId: string; status?: string; message?: string }) => {
    setOrderToast(order);
    setTimeout(() => setOrderToast(null), 4000);
  };

  const notifyMessage = (message: string) => {
    if (!message) return;
    notifyOrder({ orderId: 'system', message });
  };

  const clearOrderToast = () => setOrderToast(null);

  useEffect(() => {
    let disposed = false;

    const initSocket = async () => {
      if (!user?.id) {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        return;
      }

      const socket = await subscribeToUserOrders(user.id, (payload) => {
        notifyOrder({
          orderId: payload.orderId,
          status: payload.status,
          message: payload.message,
        });
        window.dispatchEvent(new CustomEvent('order-status-updated', { detail: payload }));
      });

      if (disposed) {
        socket?.disconnect();
        return;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      socketRef.current = socket;
    };

    void initSocket();

    return () => {
      disposed = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id]);

  const setCartQuantity = (gameId: string, packageId: number, accountIdentifier: string, quantity: number) => {
    const normalizedAccountIdentifier = accountIdentifier.trim();
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.gameId === gameId &&
          item.packageId === packageId &&
          item.accountIdentifier === normalizedAccountIdentifier,
      );
      if (idx === -1) return prev;

      if (quantity <= 0) {
        return prev.filter(
          (item) =>
            !(
              item.gameId === gameId &&
              item.packageId === packageId &&
              item.accountIdentifier === normalizedAccountIdentifier
            ),
        );
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

  const incrementCartItem = (gameId: string, packageId: number, accountIdentifier: string) => {
    const normalizedAccountIdentifier = accountIdentifier.trim();
    const current = cart.find(
      (item) =>
        item.gameId === gameId &&
        item.packageId === packageId &&
        item.accountIdentifier === normalizedAccountIdentifier,
    );
    if (!current) return;
    setCartQuantity(gameId, packageId, normalizedAccountIdentifier, current.quantity + 1);
  };

  const decrementCartItem = (gameId: string, packageId: number, accountIdentifier: string) => {
    const normalizedAccountIdentifier = accountIdentifier.trim();
    const current = cart.find(
      (item) =>
        item.gameId === gameId &&
        item.packageId === packageId &&
        item.accountIdentifier === normalizedAccountIdentifier,
    );
    if (!current) return;
    setCartQuantity(gameId, packageId, normalizedAccountIdentifier, current.quantity - 1);
  };

  const getCartQuantity = (gameId: string, packageId: number, accountIdentifier: string) => {
    const normalizedAccountIdentifier = accountIdentifier.trim();
    return (
      cart.find(
        (item) =>
          item.gameId === gameId &&
          item.packageId === packageId &&
          item.accountIdentifier === normalizedAccountIdentifier,
      )?.quantity || 0
    );
  };

  const addToCart = (item: Omit<CartItem, 'id' | 'quantity' | 'totalPrice'> & { quantity?: number }) => {
    if (!user) {
      notifyMessage(language === 'ar' ? 'يجب تسجيل الدخول لإضافة منتجات للسلة' : 'You must be logged in to add items to cart');
      return;
    }

    const quantityToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const normalizedAccountIdentifier = item.accountIdentifier.trim();
    if (!normalizedAccountIdentifier) {
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (i) =>
          i.gameId === item.gameId &&
          i.packageId === item.packageId &&
          i.accountIdentifier === normalizedAccountIdentifier,
      );
      if (existing) {
        return prev.map((i) =>
          i.gameId === item.gameId &&
          i.packageId === item.packageId &&
          i.accountIdentifier === normalizedAccountIdentifier
            ? {
                ...i,
                quantity: i.quantity + quantityToAdd,
                totalPrice: i.unitPrice * (i.quantity + quantityToAdd),
              }
            : i,
        );
      }

      const id = `${item.gameId}:${item.packageId}:${normalizedAccountIdentifier}`;
      return [
        ...prev,
        {
          ...item,
          accountIdentifier: normalizedAccountIdentifier,
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
      notifyMessage(language === 'ar' ? 'يجب تسجيل الدخول لإضافة منتجات للمفضلة' : 'You must be logged in to add items to wishlist');
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
        notifyMessage,
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
