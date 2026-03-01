import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Game } from '../types';
import { Heart, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Wishlist() {
  const { wishlist, removeFromWishlist, t } = useStore();

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
              to="/games"
              className="px-6 py-3 bg-creo-accent hover:bg-creo-accent-hover text-black font-bold rounded-xl transition-colors inline-block"
            >
              {t('browse_games') || 'Browse Games'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {wishlist.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link 
                  to={`/game/${game.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] flex flex-col h-full"
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

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFromWishlist(game.id);
                      }}
                      className="absolute top-2 left-2 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-red-500/20 text-white hover:text-red-500 transition-colors group/btn z-20"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col items-start justify-center bg-creo-card flex-1 relative z-20 -mt-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                      {game.name}
                    </h3>
                    <div className="flex items-center justify-between w-full mt-1">
                      <p className="text-xs text-creo-text-sec">
                        {game.publisher}
                      </p>
                      {game.min_price && (
                        <p className="text-xs font-bold text-creo-accent">
                          From ${game.min_price}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
