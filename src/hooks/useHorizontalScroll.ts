import React, { useRef, useState, useEffect } from 'react';

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  activeDot: number;
  dotCount: number;
}

export function useHorizontalScroll<T extends HTMLElement>(language: string) {
  const EPSILON = 2;
  const DRAG_MULTIPLIER = 1.25;
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: true,
    activeDot: 0,
    dotCount: 1,
  });

  const checkScroll = () => {
    if (ref.current) {
      const { scrollLeft: rawScrollLeft, scrollWidth, clientWidth } = ref.current;
      const currentScrollLeft = language === 'ar' ? Math.abs(rawScrollLeft) : rawScrollLeft;
      
      let canLeft = false;
      let canRight = false;
      
      if (language === 'ar') {
        canRight = Math.abs(currentScrollLeft) > EPSILON;
        canLeft = Math.abs(currentScrollLeft) + clientWidth < scrollWidth - EPSILON;
      } else {
        canLeft = currentScrollLeft > EPSILON;
        canRight = currentScrollLeft + clientWidth < scrollWidth - EPSILON;
      }

      const items = Array.from(ref.current.querySelectorAll<HTMLElement>('.home-cards-item'));
      const dotCount = Math.max(1, items.length);
      let activeDot = 0;

      if (items.length > 1) {
        if (currentScrollLeft <= EPSILON) {
          activeDot = 0;
        } else if (currentScrollLeft + clientWidth >= scrollWidth - EPSILON) {
          activeDot = items.length - 1;
        } else {
          const viewportRect = ref.current.getBoundingClientRect();
          const viewportCenter = viewportRect.left + clientWidth / 2;
          let nearestIndex = 0;
          let nearestDistance = Number.POSITIVE_INFINITY;

          for (let i = 0; i < items.length; i += 1) {
            const rect = items[i].getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const distance = Math.abs(center - viewportCenter);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = i;
            }
          }

          activeDot = nearestIndex;
        }
      }

      setScrollState({
        canScrollLeft: canLeft,
        canScrollRight: canRight,
        activeDot,
        dotCount,
      });
    }
  };

  useEffect(() => {
    const currentRef = ref.current;
    if (currentRef) {
      // Keep the initial position stable on LTR to avoid tiny auto-offset on mobile.
      if (language !== 'ar') {
        currentRef.scrollLeft = 0;
      }
    }

    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    return () => {
      window.removeEventListener('resize', checkScroll);
    };
  }, [language]);

  const onScroll = () => {
    checkScroll();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * DRAG_MULTIPLIER;
    ref.current.scrollLeft = scrollLeft - walk;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (ref.current) {
      const firstCard = ref.current.querySelector<HTMLElement>('.home-cards-item');
      const cardWidth = firstCard?.getBoundingClientRect().width ?? ref.current.clientWidth * 0.8;
      const styles = window.getComputedStyle(ref.current);
      const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
      const scrollAmount = cardWidth + gap;

      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollToDot = (index: number) => {
    if (!ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>('.home-cards-item'));
    if (items.length === 0) return;
    const dotIndex = Math.max(0, Math.min(index, items.length - 1));
    const inline: ScrollLogicalPosition = dotIndex === 0 ? 'start' : dotIndex === items.length - 1 ? 'end' : 'center';
    items[dotIndex].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline,
    });
  };

  return {
    ref,
    scrollState,
    scroll,
    scrollToDot,
    events: {
      onScroll,
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
    },
    isDragging
  };
}
