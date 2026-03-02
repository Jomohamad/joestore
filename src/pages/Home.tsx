import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames, fetchPromotions } from '../services/api';
import { Game, Promotion } from '../types';
import { Zap, ShieldCheck, Clock, Trophy, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language, t, isInWishlist, addToWishlist, removeFromWishlist } = useStore();

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
        const [gamesData, promosData] = await Promise.all([
          fetchGames(),
          fetchPromotions()
        ]);
        setGames(gamesData);
        setPromotions(promosData);
      } catch (err) {
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
    setActivePromo((prev) => (prev + 1) % promotions.length);
  };

  const prevPromo = () => {
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
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      nextPromo();
    }
    if (isRightSwipe) {
      prevPromo();
    }
  };

  useEffect(() => {
    if (promotions.length === 0) return;
    const timer = setInterval(() => {
      nextPromo();
    }, 5000);
    return () => clearInterval(timer);
  }, [promotions.length, activePromo]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin"></div>
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

  return (
    <div className="flex-1">
      {/* Promotions / Announcements Section */}
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
                  animate={{ 
                    opacity: activePromo === index ? 1 : 0,
                    zIndex: activePromo === index ? 10 : 0
                  }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 bg-black"
                >
                  <img 
                    src={promo.image_url} 
                    alt={language === 'en' ? promo.subtitle_en : promo.subtitle_ar}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                  
                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ 
                        y: activePromo === index ? 0 : 20,
                        opacity: activePromo === index ? 1 : 0 
                      }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <h2 className="text-2xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-2 md:mb-4 leading-tight max-w-2xl">
                        {language === 'en' ? promo.subtitle_en : promo.subtitle_ar}
                      </h2>
                      {promo.link_url && (
                        <Link to={promo.link_url} className="inline-block px-6 py-2.5 md:px-8 md:py-3 bg-white text-black rounded-full font-bold text-xs md:text-sm hover:bg-creo-accent transition-all transform hover:scale-105 shadow-lg">
                          {language === 'en' ? 'Claim Now' : 'احصل عليه الآن'}
                        </Link>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              ))}

              {/* Navigation Arrows */}
              {promotions.length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.preventDefault(); prevPromo(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 group-hover:opacity-100 opacity-0 md:opacity-100"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); nextPromo(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 group-hover:opacity-100 opacity-0 md:opacity-100"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Slider Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {promotions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePromo(i)}
                    className={cn(
                      "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300",
                      activePromo === i ? "bg-creo-accent w-6 md:w-8" : "bg-white/30 hover:bg-white/50"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Marquee */}
      <div className="w-full overflow-hidden border-y border-creo-border bg-creo-bg-sec/50 backdrop-blur-sm py-3">
        <div className="flex whitespace-nowrap animate-marquee-slow">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-4">
              <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-creo-accent" /> {t('feat_instant')}
              </span>
              <span className="text-creo-border text-xl">•</span>
              <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-creo-accent" /> {t('feat_secure')}
              </span>
              <span className="text-creo-border text-xl">•</span>
              <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-creo-accent" /> {t('feat_prices')}
              </span>
              <span className="text-creo-border text-xl">•</span>
              <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-creo-accent" /> {t('feat_support')}
              </span>
              <span className="text-creo-border text-xl">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Games Grid Section */}
      <section id="games" className="py-12 md:py-16 bg-creo-bg-sec relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-8 md:mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">{t('popular_games')}</h2>
          </motion.div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 md:gap-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {games
              .filter(g => g.category === 'game')
              .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
              .slice(0, 16) // Limit to top 16 popular games
              .map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
                className="min-w-[140px] sm:min-w-[160px] md:min-w-[180px] snap-start shrink-0"
              >
                <Link 
                  to={`/game/${game.id}`}
                  className="group block relative rounded-xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,215,0,0.15)] flex flex-col h-full"
                >
                  <div className="aspect-video relative overflow-hidden bg-creo-bg">
                    <img 
                      src={game.image_url} 
                      alt={game.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    
                    {/* Hover Overlay with Action */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px] z-10">
                      <div className="w-8 h-8 bg-creo-accent rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ShoppingCart className="w-4 h-4 text-black" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-0.5 border-t border-creo-border/50">
                    <h3 className="text-[10px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                      {game.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Apps Grid Section */}
      <section id="apps" className="py-12 md:py-16 bg-creo-bg relative border-t border-creo-border">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-8 md:mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">{t('popular_apps')}</h2>
          </motion.div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 md:gap-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {games
              .filter(g => g.category === 'app')
              .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
              .slice(0, 16)
              .map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
                className="min-w-[140px] sm:min-w-[160px] md:min-w-[180px] snap-start shrink-0"
              >
                <Link 
                  to={`/game/${app.id}`}
                  className="group block relative rounded-xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,215,0,0.15)] flex flex-col h-full"
                >
                  <div className="aspect-video relative overflow-hidden bg-creo-bg">
                    <img 
                      src={app.image_url} 
                      alt={app.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    
                    {/* Hover Overlay with Action */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px] z-10">
                      <div className="w-8 h-8 bg-creo-accent rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ShoppingCart className="w-4 h-4 text-black" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-0.5 border-t border-creo-border/50">
                    <h3 className="text-[10px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                      {app.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
