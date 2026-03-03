import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames, fetchPromotions } from '../services/api';
import { Game, Promotion } from '../types';
import { ShoppingCart, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn, imgSrc } from '../lib/utils';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language, t, isInWishlist, addToWishlist, removeFromWishlist } = useStore();

  const topGames = useMemo(
    () => games.filter((g) => g.category === 'game').sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 16),
    [games],
  );
  const topApps = useMemo(
    () => games.filter((g) => g.category === 'app').sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 16),
    [games],
  );

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
    const loadData = async () => {
      try {
        const [gamesData, promosData] = await Promise.all([fetchGames(), fetchPromotions()]);
        setGames(gamesData);
        setPromotions(promosData);
      } catch {
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const [activePromo, setActivePromo] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const nextPromo = () => {
    if (promotions.length === 0) return;
    setActivePromo((prev) => (prev + 1) % promotions.length);
  };

  const prevPromo = () => {
    if (promotions.length === 0) return;
    setActivePromo((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextPromo();
    if (distance < -50) prevPromo();
  };

  useEffect(() => {
    if (promotions.length === 0) return;
    const timer = setInterval(nextPromo, 5000);
    return () => clearInterval(timer);
  }, [promotions.length]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-creo-bg-sec hover:bg-creo-border text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderCatalogCard = (item: Game, index: number) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.03, ease: 'easeOut' }}
      className="card-shell"
    >
      <Link
        to={`/game/${item.id}`}
        className="group block relative rounded-[inherit] overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 h-full shadow-lg hover:shadow-[0_0_28px_rgba(255,215,0,0.28)]"
        draggable={false}
      >
        <div className="card-media relative overflow-hidden bg-creo-bg">
          <img
            src={imgSrc(item.image_url)}
            alt={item.name}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
            loading="lazy"
            referrerPolicy="no-referrer"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

          <button
            onClick={(e) => toggleWishlist(e, item)}
            className="card-touch-btn absolute top-1 right-1 z-20 rounded-full bg-black/45 text-white hover:bg-creo-accent hover:text-black transition-colors flex items-center justify-center"
            aria-label={isInWishlist(item.id) ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={cn('w-4 h-4', isInWishlist(item.id) && 'fill-creo-accent')} />
          </button>

          <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/25 backdrop-blur-[1px] z-10">
            <div className="w-9 h-9 bg-creo-accent rounded-full flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-4 h-4 text-black" />
            </div>
          </div>
        </div>

        <div className="card-body flex flex-col items-center justify-center bg-creo-card text-center">
          <h3 className="card-title font-bold text-white line-clamp-1 w-full">{item.name}</h3>
        </div>
      </Link>
    </motion.div>
  );

  const renderCatalogSection = (title: string, items: Game[], sectionId: string, sectionClassName: string) => (
    <section id={sectionId} className={sectionClassName}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-40px' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mb-5 md:mb-7"
        >
          <h2 className="text-xl md:text-2xl font-display font-bold text-white">{title}</h2>
        </motion.div>

        <div className="cards-grid-responsive">
          {items.map(renderCatalogCard)}
        </div>
      </div>
    </section>
  );

  return (
    <div className="flex-1">
      {promotions.length > 0 && (
        <section className="relative pt-4 pb-8 md:pt-8 md:pb-12 overflow-hidden bg-creo-bg">
          <div className="container mx-auto px-4">
            <div
              className="relative h-[250px] md:h-[400px] rounded-2xl md:rounded-3xl overflow-hidden border border-creo-border group"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {promotions.map((promo, index) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: activePromo === index ? 1 : 0, zIndex: activePromo === index ? 10 : 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 bg-black"
                >
                  <img
                    src={imgSrc(promo.image_url)}
                    alt={language === 'en' ? promo.subtitle_en : promo.subtitle_ar}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: activePromo === index ? 0 : 20, opacity: activePromo === index ? 1 : 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <h2
                        style={{ fontSize: `calc(1.5rem + ${(promo.font_size_scale || 5) * 0.15}rem)` }}
                        className="md:text-5xl lg:text-6xl font-display font-bold text-white mb-2 md:mb-4 leading-tight max-w-2xl transition-all duration-300"
                      >
                        {language === 'en' ? promo.subtitle_en : promo.subtitle_ar}
                      </h2>
                      {promo.link_url && (
                        <Link
                          to={promo.link_url}
                          className="inline-flex items-center justify-center min-h-11 px-6 py-2.5 md:px-8 md:py-3 bg-white text-black rounded-full font-bold text-xs md:text-sm hover:bg-creo-accent transition-all transform hover:scale-105 shadow-lg"
                        >
                          {language === 'en' ? 'Claim Now' : 'احصل عليه الآن'}
                        </Link>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              ))}

              {promotions.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      prevPromo();
                    }}
                    className="card-touch-btn absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 group-hover:opacity-100 opacity-100 md:opacity-100"
                    aria-label="Previous promotion"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      nextPromo();
                    }}
                    className="card-touch-btn absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 group-hover:opacity-100 opacity-100 md:opacity-100"
                    aria-label="Next promotion"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {promotions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePromo(i)}
                    className={cn(
                      'w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300',
                      activePromo === i ? 'bg-creo-accent w-6 md:w-8' : 'bg-white/30 hover:bg-white/50',
                    )}
                    aria-label={`Go to promotion ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {renderCatalogSection(t('popular_games'), topGames, 'games', 'py-6 md:py-8 bg-creo-bg-sec')}
      {renderCatalogSection(t('popular_apps'), topApps, 'apps', 'py-6 md:py-8 bg-creo-bg border-t border-creo-border')}
    </div>
  );
}
