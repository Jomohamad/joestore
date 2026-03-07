import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Promotion } from '../../types';
import { cn, responsiveImageProps } from '../../lib/utils';

interface PromoCarouselProps {
  promotions: Promotion[];
  language: 'en' | 'ar';
}

export default function PromoCarousel({ promotions, language }: PromoCarouselProps) {
  const [activePromo, setActivePromo] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const nextPromo = useCallback(() => {
    setActivePromo((prev) => (prev + 1) % promotions.length);
  }, [promotions.length]);

  const prevPromo = useCallback(() => {
    setActivePromo((prev) => (prev - 1 + promotions.length) % promotions.length);
  }, [promotions.length]);

  useEffect(() => {
    if (promotions.length === 0) return;
    const timer = setInterval(() => {
      nextPromo();
    }, 5000);
    return () => clearInterval(timer);
  }, [nextPromo, promotions.length]);

  if (promotions.length === 0) return null;

  return (
    <section className="relative pt-4 pb-8 md:pt-8 md:pb-12 overflow-hidden bg-creo-bg">
      <div className="container mx-auto px-4">
        <div
          className="relative h-[200px] sm:h-[250px] md:h-[360px] lg:h-[400px] rounded-2xl md:rounded-3xl overflow-hidden border border-creo-border group"
          onTouchStart={(e) => {
            setTouchEnd(null);
            setTouchStart(e.targetTouches[0].clientX);
          }}
          onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
          onTouchEnd={() => {
            if (!touchStart || !touchEnd) return;
            const distance = touchStart - touchEnd;
            if (distance > 50) nextPromo();
            if (distance < -50) prevPromo();
          }}
        >
          {promotions.map((promo, index) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: activePromo === index ? 1 : 0,
                zIndex: activePromo === index ? 10 : 0,
              }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-black"
            >
              <img
                {...responsiveImageProps(promo.image_url, { kind: 'hero', lazy: index !== activePromo })}
                alt={`Promotion ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
            </motion.div>
          ))}

          {promotions.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  prevPromo();
                }}
                aria-label="Previous promotion"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 opacity-65 md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  nextPromo();
                }}
                aria-label="Next promotion"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 opacity-65 md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {promotions.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setActivePromo(i)}
                  aria-label={`Go to promotion ${i + 1}`}
                  className="h-11 min-h-11 px-1 flex items-center justify-center"
                >
                <span
                  className={cn(
                    'w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300',
                    activePromo === i ? 'bg-creo-accent w-6 md:w-8' : 'bg-white/30 hover:bg-white/50'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
