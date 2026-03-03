import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingCart, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Game } from '../../types';
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll';
import { cn, imgSrc } from '../../lib/utils';

interface HorizontalCatalogSectionProps {
  id: string;
  title: string;
  items: Game[];
  language: 'en' | 'ar';
  bordered?: boolean;
  viewMoreTo?: string;
  viewMoreLabel?: string;
  onToggleWishlist: (e: React.MouseEvent, game: Game) => void;
  isInWishlist: (gameId: string) => boolean;
}

export default function HorizontalCatalogSection({
  id,
  title,
  items,
  language,
  bordered = false,
  viewMoreTo,
  viewMoreLabel,
  onToggleWishlist,
  isInWishlist,
}: HorizontalCatalogSectionProps) {
  const scroll = useHorizontalScroll<HTMLDivElement>(language);

  return (
    <section
      id={id}
      className={cn(
        'py-6 md:py-8 relative group/section',
        bordered ? 'bg-creo-bg border-t border-creo-border' : 'bg-creo-bg'
      )}
    >
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-50px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-6 md:mb-8 flex items-center justify-between gap-3"
        >
          <h2 className="text-xl md:text-2xl font-display font-bold text-white">{title}</h2>
          {viewMoreTo && (
            <Link
              to={viewMoreTo}
              className="text-xs md:text-sm font-semibold text-creo-accent hover:text-white transition-colors whitespace-nowrap"
            >
              {viewMoreLabel || 'View more >>'}
            </Link>
          )}
        </motion.div>

        <div className="relative">
          {scroll.scrollState.canScrollLeft && (
            <button
              onClick={() => scroll.scroll(language === 'ar' ? 'right' : 'left')}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-65 md:opacity-0 md:group-hover/section:opacity-100 disabled:opacity-0',
                language === 'ar' ? 'right-2 md:-right-4' : 'left-2 md:-left-4'
              )}
              aria-label="Scroll left"
            >
              <ChevronLeft className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          )}

          {scroll.scrollState.canScrollRight && (
            <button
              onClick={() => scroll.scroll(language === 'ar' ? 'left' : 'right')}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-creo-card/80 backdrop-blur-sm border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black transition-all opacity-65 md:opacity-0 md:group-hover/section:opacity-100 disabled:opacity-0',
                language === 'ar' ? 'left-2 md:-left-4' : 'right-2 md:-right-4'
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          )}

          <div
            className={cn(
              'home-cards-edge left transition-opacity duration-200',
              scroll.scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden="true"
          />
          <div
            className={cn(
              'home-cards-edge right transition-opacity duration-200',
              scroll.scrollState.canScrollRight ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden="true"
          />

          <div
            ref={scroll.ref}
            {...scroll.events}
              className={cn(
                'home-cards-track flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth',
                scroll.isDragging ? 'cursor-grabbing snap-none scroll-auto' : 'cursor-grab'
              )}
            >
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
                className={cn(
                  'home-cards-item shrink-0',
                  index === 0 ? 'snap-start' : index === items.length - 1 ? 'snap-end' : 'snap-center'
                )}
              >
                <Link
                  to={`/game/${item.id}`}
                  className="group block relative aspect-video rounded-xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(255,215,0,0.35),inset_0_0_20px_rgba(255,215,0,0.12)]"
                  draggable={false}
                >
                  <div className="absolute inset-0 bg-creo-bg">
                    <img
                      src={imgSrc(item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-fill transform group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <button
                      onClick={(e) => onToggleWishlist(e, item)}
                      className="absolute top-1.5 right-1.5 z-20 p-1.5 md:p-2 rounded-full bg-black/40 text-white hover:bg-creo-accent transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Heart className={isInWishlist(item.id) ? 'w-4 h-4 md:w-5 md:h-5 fill-creo-accent' : 'w-4 h-4 md:w-5 md:h-5'} />
                    </button>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-sm z-10 pb-4">
                      <div className="w-7 h-7 md:w-9 md:h-9 bg-creo-accent rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.6)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ShoppingCart className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-black" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-2 z-20 flex flex-col items-center justify-end text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h3 className="text-[11px] md:text-xs font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
