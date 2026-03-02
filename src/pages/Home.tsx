import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames, fetchPromotions } from '../services/api';
import { Game, Promotion } from '../types';
import { Zap, ShieldCheck, Clock, Trophy, ShoppingCart, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll';
import { cn, imgSrc } from '../lib/utils';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language, t, isInWishlist, addToWishlist, removeFromWishlist } = useStore();

  const gamesScroll = useHorizontalScroll<HTMLDivElement>(language);
  const appsScroll = useHorizontalScroll<HTMLDivElement>(language);

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
                    src={imgSrc(promo.image_url)} 
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
                      <h2 
                        style={{ 
                          fontSize: `calc(1.5rem + ${(promo.font_size_scale || 5) * 0.15}rem)`,
                        }}
                        className="md:text-5xl lg:text-6xl font-display font-bold text-white mb-2 md:mb-4 leading-tight max-w-2xl transition-all duration-300"
                      >
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

      {/* Games Grid Section */}
      <section id="games" className="py-6 md:py-8 bg-creo-bg-sec relative group/section">
        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6 md:mb-8"
          >
            <h2 className="text-xl md:text-2xl font-display font-bold text-white">{t('popular_games')}</h2>
          </motion.div>

          {/* Hover Arrows */}
          {gamesScroll.scrollState.canScrollLeft && (
            <button 
              onClick={() => gamesScroll.scroll(language === 'ar' ? 'right' : 'left')} 
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-0 group-hover/section:opacity-100 disabled:opacity-0",
                language === 'ar' ? "right-2 md:-right-4" : "left-2 md:-left-4"
              )}
              aria-label="Scroll left"
            >
              <ChevronLeft className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          )}
          
          {gamesScroll.scrollState.canScrollRight && (
            <button 
              onClick={() => gamesScroll.scroll(language === 'ar' ? 'left' : 'right')} 
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-0 group-hover/section:opacity-100 disabled:opacity-0",
                language === 'ar' ? "left-2 md:-left-4" : "right-2 md:-right-4"
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          )}

          <div 
            ref={gamesScroll.ref}
            {...gamesScroll.events}
            className={cn(
              "flex overflow-x-auto snap-x snap-mandatory gap-2 md:gap-3 pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth",
              gamesScroll.isDragging ? "cursor-grabbing snap-none scroll-auto" : "cursor-grab"
            )}
          >
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
                className="min-w-[10rem] sm:min-w-[14rem] md:min-w-[16rem] lg:min-w-[18rem] snap-start shrink-0 flex-none"
              >
                <Link 
                  to={`/game/${game.id}`}
                  className="group block relative rounded-xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 h-full shadow-lg group-hover:shadow-[0_0_30px_rgba(255,215,0,0.4),inset_0_0_30px_rgba(255,215,0,0.1)]"
                  draggable={false}
                >
                  <div className="aspect-video relative overflow-hidden bg-creo-bg h-full">
                    <img 
                      src={imgSrc(game.image_url)} 
                      alt={game.name}
                      className="w-full h-full object-cover transform group-hover:scale-120 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {/* wishlist button for game */}
                    <button
                      onClick={(e) => toggleWishlist(e, game)}
                      className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-creo-accent transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Heart className={isInWishlist(game.id) ? "w-5 h-5 fill-creo-accent" : "w-5 h-5"} />
                    </button>
                    
                    {/* Hover Overlay with Action */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-sm z-10 pb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-creo-accent rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.6)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-black" />
                      </div>
                    </div>

                    {/* Text Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 z-20 flex flex-col items-center justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h3 className="text-[11px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                        {game.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-3 flex flex-col items-center justify-center bg-creo-card text-center">
                    <h3 className="text-sm font-bold text-white truncate">{game.name}</h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Apps Grid Section */}
      <section id="apps" className="py-6 md:py-8 bg-creo-bg relative border-t border-creo-border group/section">
        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6 md:mb-8"
          >
            <h2 className="text-xl md:text-2xl font-display font-bold text-white">{t('popular_apps')}</h2>
          </motion.div>

          {/* Hover Arrows */}
          {appsScroll.scrollState.canScrollLeft && (
            <button 
              onClick={() => appsScroll.scroll(language === 'ar' ? 'right' : 'left')} 
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-0 group-hover/section:opacity-100 disabled:opacity-0",
                language === 'ar' ? "right-2 md:-right-4" : "left-2 md:-left-4"
              )}
              aria-label="Scroll left"
            >
              <ChevronLeft className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          )}
          
          {appsScroll.scrollState.canScrollRight && (
            <button 
              onClick={() => appsScroll.scroll(language === 'ar' ? 'left' : 'right')} 
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-0 group-hover/section:opacity-100 disabled:opacity-0",
                language === 'ar' ? "left-2 md:-left-4" : "right-2 md:-right-4"
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          )}

          <div 
            ref={appsScroll.ref}
            {...appsScroll.events}
            className={cn(
              "flex overflow-x-auto snap-x snap-mandatory gap-2 md:gap-3 pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth",
              appsScroll.isDragging ? "cursor-grabbing snap-none scroll-auto" : "cursor-grab"
            )}
          >
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
                className="min-w-[10rem] sm:min-w-[14rem] md:min-w-[16rem] lg:min-w-[18rem] snap-start shrink-0 flex-none"
              >
                <Link 
                  to={`/game/${app.id}`}
                  className="group block relative rounded-xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 h-full shadow-lg group-hover:shadow-[0_0_30px_rgba(255,215,0,0.4),inset_0_0_30px_rgba(255,215,0,0.1)]"
                  draggable={false}
                >
                  <div className="aspect-video relative overflow-hidden bg-creo-bg h-full">
                    <img 
                      src={imgSrc(app.image_url)} 
                      alt={app.name}
                      className="w-full h-full object-cover transform group-hover:scale-120 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {/* wishlist button for app */}
                    <button
                      onClick={(e) => toggleWishlist(e, app)}
                      className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-creo-accent transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Heart className={isInWishlist(app.id) ? "w-5 h-5 fill-creo-accent" : "w-5 h-5"} />
                    </button>
                    
                    {/* Hover Overlay with Action */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-sm z-10 pb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-creo-accent rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.6)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-black" />
                      </div>
                    </div>

                    {/* Text Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 z-20 flex flex-col items-center justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h3 className="text-[11px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                        {app.name}
                      </h3>
                    </div>
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
