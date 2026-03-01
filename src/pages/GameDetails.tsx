import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGameDetails, fetchGamePackages } from '../services/api';
import { Game, Package } from '../types';
import { ShieldCheck, ShoppingCart, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, t, language, isInWishlist, addToWishlist, removeFromWishlist, formatPrice } = useStore();
  
  const [game, setGame] = useState<Game | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<number | null>(null);

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
      playerId: '', // Will be filled in Cart
    });
    
    setAddingToCartId(null);
    // Removed navigate('/cart') to keep user on the same page
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
    <div className="flex-1 bg-creo-bg pb-20 md:pb-24">
      {/* Game Header */}
      <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-creo-bg-sec/50 via-creo-bg/80 to-creo-bg z-10"></div>
        <img 
          src={game.image_url} 
          alt={game.name} 
          className="w-full h-full object-cover opacity-40 blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-0 left-0 w-full z-20 pb-6 md:pb-8">
          <div className="container mx-auto px-4 flex items-end gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-creo-bg shadow-2xl shrink-0 bg-creo-bg-sec">
              <img 
                src={game.image_url} 
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
                <span className="px-2 py-1 bg-creo-bg-sec rounded-md">{game.publisher}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 md:mt-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">{t('select_package')}</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-creo-card border border-creo-border rounded-2xl p-5 md:p-6 hover:border-creo-accent/50 transition-all duration-300 group relative overflow-hidden flex flex-col"
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-creo-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {pkg.bonus > 0 && (
                <div className="absolute top-0 right-0 bg-creo-accent text-black text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
                  +{pkg.bonus} {t('bonus')}
                </div>
              )}

              <div className="relative z-10 flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl md:text-3xl font-bold text-white">{pkg.amount}</span>
                  <span className="text-sm md:text-base font-medium text-creo-text-sec">{game.currency_name}</span>
                </div>
                
                <div className="text-lg md:text-xl font-bold text-creo-accent mb-6">
                  {formatPrice(pkg.price)}
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-[1fr,auto] gap-3 mt-auto">
                <button
                  onClick={() => handleAddToCart(pkg)}
                  disabled={addingToCartId === pkg.id}
                  className="flex items-center justify-center gap-2 bg-creo-bg-sec hover:bg-creo-accent hover:text-black text-white py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingToCartId === pkg.id ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      {t('add_to_cart')}
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => toggleWishlist(pkg)}
                  className={cn(
                    "p-3 rounded-xl border transition-all duration-300 flex items-center justify-center",
                    isInWishlist(game.id, pkg.id)
                      ? "bg-creo-accent/10 border-creo-accent text-creo-accent"
                      : "bg-creo-bg-sec border-transparent text-creo-muted hover:text-white hover:bg-creo-border"
                  )}
                  title={isInWishlist(game.id, pkg.id) ? t('remove_from_wishlist') : t('add_to_wishlist')}
                >
                  <Heart className={cn("w-5 h-5", isInWishlist(game.id, pkg.id) && "fill-current")} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
