import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Game } from '../types';
import { Heart, Trash2, AlertCircle, X, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import React, { useState } from 'react';

export default function Wishlist() {
  const { wishlist, removeFromWishlist, t, formatPrice } = useStore();
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleRemove = (e: React.MouseEvent, gameId: string, pkgId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const uniqueId = `${gameId}-${pkgId || 'base'}`;
    
    if (confirmRemoveId === uniqueId) {
      removeFromWishlist(gameId, pkgId);
      setConfirmRemoveId(null);
    } else {
      setConfirmRemoveId(uniqueId);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmRemoveId(prev => prev === uniqueId ? null : prev), 3000);
    }
  };

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 md:mb-4">
              {t('wishlist') || 'Wishlist'}
            </h1>
            <p className="text-sm md:text-base text-creo-text-sec max-w-xl">
              {t('wishlist_desc') || 'Your collection of favorite games and apps.'}
            </p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <Heart className="w-16 h-16 text-creo-muted mx-auto mb-4" />
            <p className="text-creo-text-sec text-lg mb-6">
              {t('wishlist_empty') || 'Your wishlist is empty.'}
            </p>
            <Link 
              to="/"
              className="px-6 py-3 bg-creo-accent hover:bg-creo-accent-hover text-black font-bold rounded-xl transition-colors inline-block"
            >
              {t('browse_games') || 'Browse Games'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 justify-center">
            {wishlist.map((item, index) => {
              const game = item.game;
              const pkg = item.package;
              const uniqueKey = `${game.id}-${pkg?.id || 'base'}`;

              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Link 
                    to={`/game/${game.id}`}
                    className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] flex flex-col h-full w-40 sm:w-44 md:w-48 lg:w-52 mx-auto flex-none"
                  >
                    <div className="aspect-video relative overflow-hidden bg-creo-bg">
                      <img 
                        src={game.image_url} 
                        alt={game.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-transparent to-transparent opacity-80"></div>
                      
                      {/* Genre Badge */}
                      {game.genre && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white/80 border border-white/10">
                          {game.genre}
                        </div>
                      )}

                      {/* Package Badge */}
                      {pkg && (
                        <div className="absolute bottom-2 right-2 bg-creo-accent text-black px-2 py-1 rounded text-xs font-bold shadow-lg">
                          {pkg.amount} {game.currency_name}
                        </div>
                      )}

                      {/* Remove Button (Heart) */}
                      <button
                        onClick={(e) => handleRemove(e, game.id, pkg?.id)}
                        className={`absolute top-1.5 right-1.5 p-1.5 rounded-full backdrop-blur-md transition-all duration-300 z-30 flex items-center gap-1.5 ${
                          confirmRemoveId === uniqueKey 
                            ? "bg-red-500 text-white px-2.5 shadow-lg shadow-red-500/20" 
                            : "bg-black/40 text-creo-accent hover:bg-red-500/20"
                        }`}
                        title={confirmRemoveId === uniqueKey ? "Confirm removal" : "Remove from wishlist"}
                      >
                        {confirmRemoveId === uniqueKey ? (
                          <>
                            <AlertCircle className="w-3 h-3 animate-pulse" />
                            <span className="text-[8px] font-bold uppercase tracking-wider">Remove?</span>
                          </>
                        ) : (
                          <Heart className="w-3.5 h-3.5 fill-creo-accent" />
                        )}
                      </button>
                    </div>
                    <div className="p-3 flex flex-col items-start justify-center bg-creo-card flex-1 relative z-20 -mt-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                        {game.name}
                      </h3>
                      <div className="flex items-center justify-between w-full mt-1">
                        {pkg ? (
                          <p className="text-xs font-bold text-creo-accent">
                            {formatPrice(pkg.price)}
                          </p>
                        ) : (
                          game.min_price && (
                            <p className="text-[10px] font-bold text-creo-accent">
                              {t('from') || 'From'} {formatPrice(game.min_price)}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
