import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { imgSrc } from '../lib/utils';
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
      setTimeout(() => setConfirmRemoveId((prev) => (prev === uniqueId ? null : prev)), 3000);
    }
  };

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 md:mb-4">{t('wishlist') || 'Wishlist'}</h1>
            <p className="text-sm md:text-base text-creo-text-sec max-w-xl">{t('wishlist_desc') || 'Your collection of favorite games and apps.'}</p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <Heart className="w-16 h-16 text-creo-muted mx-auto mb-4" />
            <p className="text-creo-text-sec text-lg mb-6">{t('wishlist_empty') || 'Your wishlist is empty.'}</p>
            <Link to="/" className="inline-flex items-center justify-center min-h-11 px-6 py-3 bg-creo-accent text-black font-bold rounded-xl transition-colors hover:bg-white">
              {t('browse_games') || 'Browse Games'}
            </Link>
          </div>
        ) : (
          <div className="cards-grid-responsive">
            {wishlist.map((item, index) => {
              const game = item.game;
              const pkg = item.package;
              const uniqueKey = `${game.id}-${pkg?.id || 'base'}`;
              const isConfirming = confirmRemoveId === uniqueKey;

              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                  className="card-shell"
                >
                  <Link
                    to={`/game/${game.id}`}
                    className="group block relative rounded-[inherit] overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 shadow-lg hover:shadow-[0_0_28px_rgba(255,215,0,0.28)] flex flex-col h-full"
                  >
                    <div className="card-media relative overflow-hidden bg-creo-bg">
                      <img
                        src={imgSrc(game.image_url)}
                        alt={game.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-transparent to-transparent opacity-100 group-hover:opacity-85 transition-opacity duration-300" />

                      {game.genre && (
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] uppercase font-bold text-white/85 border border-white/10">
                          {game.genre}
                        </div>
                      )}

                      {pkg && (
                        <div className="absolute bottom-2 left-2 bg-creo-accent text-black px-2 py-1 rounded text-[11px] font-bold shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                          {pkg.amount} {game.currency_name}
                        </div>
                      )}

                      <button
                        onClick={(e) => handleRemove(e, game.id, pkg?.id)}
                        className={`card-touch-btn absolute top-1 right-1 rounded-full backdrop-blur-md transition-all duration-300 z-30 flex items-center justify-center ${
                          isConfirming ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-black/45 text-creo-accent hover:bg-red-500/25'
                        }`}
                        title={isConfirming ? 'Confirm removal' : 'Remove from wishlist'}
                        aria-label={isConfirming ? 'Confirm removal' : 'Remove from wishlist'}
                      >
                        {isConfirming ? <AlertCircle className="w-4 h-4 animate-pulse" /> : <Heart className="w-4 h-4 fill-creo-accent" />}
                      </button>
                    </div>

                    <div className="card-body flex flex-col items-start justify-center bg-creo-card flex-1">
                      <h3 className="card-title font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">{game.name}</h3>
                      <div className="flex items-center justify-between w-full mt-1">
                        {pkg ? (
                          <p className="text-xs font-bold text-creo-accent">{formatPrice(pkg.price)}</p>
                        ) : (
                          game.min_price && <p className="text-xs font-bold text-creo-accent">{t('from')} {formatPrice(game.min_price)}</p>
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
