import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, ShoppingCart } from 'lucide-react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { useStore } from '../context/StoreContext';
import { responsiveImageProps } from '../lib/utils';
import { ProductGridSkeleton, SkeletonBlock } from '../components/skeletons';

export default function AppsCatalog() {
  const { t, isInWishlist, addToWishlist, removeFromWishlist } = useStore();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchGames();
        setGames(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const items = useMemo(
    () => games.filter((g) => g.category === 'app').sort((a, b) => a.name.localeCompare(b.name)),
    [games],
  );

  const toggleWishlist = (e: MouseEvent, item: Game) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-creo-bg py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <SkeletonBlock className="h-10 w-52" />
          </div>
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h1 className="text-[clamp(1.4rem,4vw,2.4rem)] font-display font-bold text-white">{t('popular_apps')}</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: '-50px' }}
              transition={{ duration: 0.5, delay: Math.min(index * 0.03, 0.35), ease: 'easeOut' }}
            >
              <Link
                to={`/game/${item.id}`}
                className="group block relative aspect-video rounded-xl overflow-hidden border border-creo-border bg-creo-card hover:border-creo-accent active:scale-[0.99] transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(255,215,0,0.35),inset_0_0_20px_rgba(255,215,0,0.12)]"
              >
                <div className="absolute inset-0 bg-creo-bg">
                  <img
                    {...responsiveImageProps(item.image_url, { kind: 'card' })}
                    alt={item.name}
                    className="w-full h-full object-fill transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-300" />
                  <button
                    onClick={(e) => toggleWishlist(e, item)}
                    aria-label={isInWishlist(item.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    className="absolute top-1.5 right-1.5 z-20 w-11 h-11 md:w-9 md:h-9 rounded-full bg-black/40 text-white hover:bg-creo-accent transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center"
                  >
                    <Heart className={isInWishlist(item.id) ? 'w-4 h-4 md:w-5 md:h-5 fill-creo-accent' : 'w-4 h-4 md:w-5 md:h-5'} />
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-sm z-10 pb-4">
                    <div className="w-7 h-7 md:w-9 md:h-9 bg-creo-accent rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.6)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                      <ShoppingCart className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-black" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 z-20 flex flex-col items-center justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 className="text-[11px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">{item.name}</h3>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
