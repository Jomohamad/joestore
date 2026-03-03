import { MouseEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn, imgSrc } from '../lib/utils';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language, isInWishlist, addToWishlist, removeFromWishlist } = useStore();
  const scroll = useHorizontalScroll<HTMLDivElement>(language);

  const toggleWishlist = (e: MouseEvent, game: Game) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(game.id)) {
      removeFromWishlist(game.id);
    } else {
      addToWishlist(game);
    }
  };

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      try {
        const data = await fetchGames();
        const filtered = data.filter(
          (item) => item.name.toLowerCase().includes(query.toLowerCase()) || item.publisher.toLowerCase().includes(query.toLowerCase()),
        );
        setResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      loadResults();
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 relative group/section">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-8">{t('search_results').replace('{query}', query)}</h1>

        {results.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <p className="text-creo-text-sec text-lg">{t('no_results').replace('{query}', query)}</p>
          </div>
        ) : (
          <>
            {scroll.scrollState.canScrollLeft && (
              <button
                onClick={() => scroll.scroll(language === 'ar' ? 'right' : 'left')}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-65 md:opacity-0 md:group-hover/section:opacity-100 disabled:opacity-0',
                  language === 'ar' ? 'right-2 md:-right-4' : 'left-2 md:-left-4',
                )}
              >
                <ChevronLeft className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {scroll.scrollState.canScrollRight && (
              <button
                onClick={() => scroll.scroll(language === 'ar' ? 'left' : 'right')}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-65 md:opacity-0 md:group-hover/section:opacity-100 disabled:opacity-0',
                  language === 'ar' ? 'left-2 md:-left-4' : 'right-2 md:-right-4',
                )}
              >
                <ChevronRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            )}

            <div className="home-cards-edge right" />
            <div
              ref={scroll.ref}
              {...scroll.events}
              className={cn(
                'home-cards-track flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth',
                scroll.isDragging ? 'cursor-grabbing snap-none scroll-auto' : 'cursor-grab',
              )}
            >
              {results.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
                  className="home-cards-item snap-start shrink-0"
                >
                  <Link
                    to={`/game/${item.id}`}
                    className="group block relative aspect-video rounded-xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(255,215,0,0.35),inset_0_0_20px_rgba(255,215,0,0.12)]"
                  >
                    <div className="absolute inset-0 bg-creo-bg">
                      <img
                        src={imgSrc(item.image_url)}
                        alt={item.name}
                        className="w-full h-full object-fill transform group-hover:scale-105 transition-transform duration-500 ease-out"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <button
                        onClick={(e) => toggleWishlist(e, item)}
                        className="absolute top-1.5 right-1.5 z-20 p-1.5 md:p-2 rounded-full bg-black/40 text-white hover:bg-creo-accent transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Heart className={isInWishlist(item.id) ? 'w-4 h-4 md:w-5 md:h-5 fill-creo-accent' : 'w-4 h-4 md:w-5 md:h-5'} />
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 p-2 z-20 flex flex-col items-center justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <h3 className="text-[11px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">{item.name}</h3>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
