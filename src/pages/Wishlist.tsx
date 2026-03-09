import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { responsiveImageProps, cn } from '../lib/utils';
import { MouseEvent, useState } from 'react';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll';

export default function Wishlist() {
  const { wishlist, removeFromWishlist, t, language } = useStore();
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const scroll = useHorizontalScroll<HTMLDivElement>(language);

  const handleRemove = (e: MouseEvent, gameId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const uniqueId = gameId;

    if (confirmRemoveId === uniqueId) {
      removeFromWishlist(gameId);
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
            <h1 className="text-[clamp(1.6rem,5vw,3rem)] font-display font-bold text-white mb-2 md:mb-4">{t('wishlist') || 'Wishlist'}</h1>
            <p className="text-sm md:text-base text-creo-text-sec max-w-xl">{t('wishlist_desc') || 'Your collection of favorite games and apps.'}</p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <Heart className="w-16 h-16 text-creo-muted mx-auto mb-4" />
            <p className="text-creo-text-sec text-lg mb-6">{t('wishlist_empty') || 'Your wishlist is empty.'}</p>
            <Link to="/" className="px-6 py-3 bg-creo-accent hover:bg-creo-accent-hover text-black font-bold rounded-xl transition-colors inline-block">
              {t('browse_games') || 'Browse Games'}
            </Link>
          </div>
        ) : (
          <div className="relative group/section">
            <div
              className={cn(
                'home-cards-edge left transition-opacity duration-200',
                scroll.scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden="true"
            />
            <div
              className={cn(
                'home-cards-edge right transition-opacity duration-200',
                scroll.scrollState.canScrollRight ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden="true"
            />
            {scroll.scrollState.canScrollLeft && (
              <button
                onClick={() => scroll.scroll(language === 'ar' ? 'right' : 'left')}
                aria-label="Scroll wishlist left"
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-10 md:h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-65 md:opacity-0 md:group-hover/section:opacity-100 disabled:opacity-0',
                  language === 'ar' ? 'right-2 md:-right-4' : 'left-2 md:-left-4',
                )}
              >
                <ChevronLeft className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {scroll.scrollState.canScrollRight && (
              <button
                onClick={() => scroll.scroll(language === 'ar' ? 'left' : 'right')}
                aria-label="Scroll wishlist right"
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-10 md:h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-65 md:opacity-0 md:group-hover/section:opacity-100 disabled:opacity-0',
                  language === 'ar' ? 'left-2 md:-left-4' : 'right-2 md:-right-4',
                )}
              >
                <ChevronRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            )}

            <div
              ref={scroll.ref}
              {...scroll.events}
              className={cn(
                'home-cards-track flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth touch-auto',
                scroll.isDragging ? 'cursor-grabbing snap-none scroll-auto' : 'cursor-grab',
              )}
            >
              {wishlist.map((item, index) => {
                const game = item.game;
                const uniqueKey = game.id;
                const isConfirming = confirmRemoveId === uniqueKey;

                return (
                  <motion.div
                    key={uniqueKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.03 }}
                    className={cn(
                      'home-cards-item shrink-0',
                      index === 0 ? 'snap-start' : index === wishlist.length - 1 ? 'snap-end' : 'snap-center',
                    )}
                  >
                    <Link
                      to={`/game/${game.id}`}
                      className="group block relative aspect-video rounded-xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent active:scale-[0.99] transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(255,215,0,0.35),inset_0_0_20px_rgba(255,215,0,0.12)]"
                    >
                      <div className="absolute inset-0 bg-creo-bg">
                        <img
                          {...responsiveImageProps(game.image_url, { kind: 'card' })}
                          alt={game.name}
                          className="w-full h-full object-fill transform group-hover:scale-105 transition-transform duration-500 ease-out"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-300" />

                        <button
                          onClick={(e) => handleRemove(e, game.id)}
                          aria-label={isConfirming ? 'Confirm remove from wishlist' : 'Remove from wishlist'}
                          className={`absolute top-1.5 right-1.5 w-11 h-11 md:w-9 md:h-9 rounded-full backdrop-blur-md transition-all duration-300 z-30 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
                            isConfirming ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-black/40 text-creo-accent hover:bg-red-500/20'
                          }`}
                        >
                          {isConfirming ? <AlertCircle className="w-4 h-4 animate-pulse" /> : <Heart className="w-4 h-4 fill-creo-accent" />}
                        </button>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-2 z-20 flex flex-col items-center justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <h3 className="text-[11px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">{game.name}</h3>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
