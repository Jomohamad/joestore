import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn, imgSrc } from '../lib/utils';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, isInWishlist, addToWishlist, removeFromWishlist } = useStore();

  const toggleWishlist = (e: React.MouseEvent, game: Game) => {
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
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-8">{t('search_results').replace('{query}', query)}</h1>

        {results.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <p className="text-creo-text-sec text-lg">{t('no_results').replace('{query}', query)}</p>
          </div>
        ) : (
          <div className="cards-grid-responsive">
            {results.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.03 }}
                className="card-shell"
              >
                <Link
                  to={`/game/${item.id}`}
                  className="group block relative rounded-[inherit] overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 shadow-lg hover:shadow-[0_0_28px_rgba(255,215,0,0.28)] flex flex-col h-full"
                >
                  <div className="card-media relative overflow-hidden bg-creo-bg">
                    <img
                      src={imgSrc(item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-transparent to-transparent opacity-100 group-hover:opacity-85 transition-opacity duration-300" />

                    <button
                      onClick={(e) => toggleWishlist(e, item)}
                      className="card-touch-btn absolute top-1 right-1 z-20 rounded-full bg-black/45 text-white hover:bg-creo-accent hover:text-black transition-colors flex items-center justify-center"
                      aria-label={isInWishlist(item.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart className={cn('w-4 h-4', isInWishlist(item.id) && 'fill-creo-accent')} />
                    </button>

                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] uppercase font-bold text-white/85 border border-white/10">
                      {item.category === 'game' ? t('games') : t('apps')}
                    </div>
                  </div>

                  <div className="card-body flex flex-col items-center justify-center text-center bg-creo-card flex-1">
                    <h3 className="card-title font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">{item.name}</h3>
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
