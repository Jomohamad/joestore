import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { fetchGameDetails, fetchGamePackages } from '../services/api';
import { Game, Package } from '../types';
import { ShieldCheck, ShoppingCart, Heart, CheckCircle2, X } from 'lucide-react';
import { cn, imgSrc } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, t, language, isInWishlist, addToWishlist, removeFromWishlist, formatPrice } = useStore();
  
  const [game, setGame] = useState<Game | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [lastAddedPkg, setLastAddedPkg] = useState<Package | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [gameData, packagesData] = await Promise.all([
          fetchGameDetails(id),
          fetchGamePackages(id)
        ]);
        setGame(gameData);
        setPackages(packagesData);
      } catch (err) {
        setError(t('failed_load_details'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, t]);

  const handleAddToCart = async (pkg: Package) => {
    if (!game) return;
    
    if (!user) {
      setShowLoginError(true);
      setTimeout(() => setShowLoginError(false), 4000);
      return;
    }
    
    setAddingToCartId(pkg.id);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 600));

    addToCart({
      id: Math.random().toString(36).substr(2, 9),
      gameId: game.id,
      gameName: game.name,
      gameImage: game.image_url,
      packageId: pkg.id.toString(),
      packageName: `${pkg.amount} ${game.currency_name}`,
      amount: pkg.amount,
      currency: game.currency_name,
      price: pkg.price,
    });
    
    setAddingToCartId(null);
    setLastAddedPkg(pkg);
    setShowSuccess(true);
    
    // Hide toast after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const toggleWishlist = (pkg: Package) => {
    if (!game) return;
    if (isInWishlist(game.id, pkg.id)) {
      removeFromWishlist(game.id, pkg.id);
    } else {
      addToWishlist(game, pkg);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || t('game_not_found')}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-creo-bg-sec hover:bg-creo-border text-white rounded-lg transition-colors"
          >
            {t('back_to_home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg pb-20 md:pb-24 relative">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-creo-card border border-creo-accent/50 rounded-2xl p-4 shadow-2xl shadow-creo-accent/20 flex items-center gap-4 backdrop-blur-xl">
              <div className="w-10 h-10 bg-creo-accent rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-black" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">
                  {t('added_to_cart') || 'Added to Cart!'}
                </h4>
                <p className="text-creo-text-sec text-xs">
                  {lastAddedPkg?.amount} {game.currency_name} {t('has_been_added') || 'has been added to your cart.'}
                </p>
              </div>
              <button 
                onClick={() => setShowSuccess(false)}
                className="p-1 text-creo-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Error Toast */}
      <AnimatePresence>
        {showLoginError && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-creo-card border border-red-500/50 rounded-2xl p-4 shadow-2xl shadow-red-500/10 flex items-center gap-4 backdrop-blur-xl">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">
                  {language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Login Required'}
                </h4>
                <p className="text-creo-text-sec text-xs">
                  {language === 'ar' 
                    ? 'يجب عليك تسجيل الدخول أولاً لتتمكن من إضافة منتجات إلى السلة.' 
                    : 'You must log in first to be able to add items to your cart.'}
                </p>
              </div>
              <button 
                onClick={() => setShowLoginError(false)}
                className="p-1 text-creo-muted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Header */}
      <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-creo-bg-sec/50 via-creo-bg/80 to-creo-bg z-10"></div>
        <img 
          src={imgSrc(game.image_url)} 
          alt={game.name} 
          className="w-full h-full object-cover opacity-40 blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-0 left-0 w-full z-20 pb-6 md:pb-8">
          <div className="container mx-auto px-4 flex items-end gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-creo-bg shadow-2xl shrink-0 bg-creo-bg-sec">
              <img 
                src={imgSrc(game.image_url)} 
                alt={game.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mb-1 md:mb-2 flex-1">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-1 md:mb-2">{game.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-creo-text-sec">
                <span className="italic">{game.publisher}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 md:mt-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">{t('select_package')}</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-44 sm:w-52 md:w-56 lg:w-60 bg-creo-card border border-creo-border rounded-xl overflow-hidden hover:border-creo-accent transition-all duration-300 group relative flex flex-col h-full hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,215,0,0.15)] mx-auto"
            >
              <div className="aspect-video relative overflow-hidden bg-creo-bg-sec/30 flex items-center justify-center group-hover:bg-creo-bg-sec/50 transition-colors">
                {/* Background Accent - Large faded amount */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                  <span className="text-7xl font-bold text-white transform -rotate-12">{pkg.amount}</span>
                </div>

                {/* Main Display in Aspect Area */}
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-2xl md:text-3xl font-bold text-white group-hover:text-creo-accent transition-colors">{pkg.amount}</span>
                  <span className="text-[10px] uppercase tracking-widest text-creo-muted font-bold">{game.currency_name}</span>
                </div>



                {pkg.bonus > 0 && (
                  <div className="absolute top-1.5 left-1.5 bg-creo-accent text-black text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border border-white/10 z-10">
                    +{pkg.bonus} {t('bonus')}
                  </div>
                )}

                {/* Hover Overlay with Action */}
                <button
                  onClick={() => handleAddToCart(pkg)}
                  disabled={addingToCartId === pkg.id}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px] z-10"
                >
                  <div className="w-8 h-8 bg-creo-accent rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                    {addingToCartId === pkg.id ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 text-black" />
                    )}
                  </div>
                </button>
              </div>

              <div className="p-2 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-0.5 border-t border-creo-border/50">
                <p className="text-[11px] font-bold text-creo-accent">
                  {formatPrice(pkg.price)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
