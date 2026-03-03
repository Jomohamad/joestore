import React, { useRef, useState, useEffect } from 'react';

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export function useHorizontalScroll<T extends HTMLElement>(language: string) {
  const EPSILON = 2;
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: true,
  });

  const checkScroll = () => {
    if (ref.current) {
      const { scrollLeft: currentScrollLeft, scrollWidth, clientWidth } = ref.current;
      
      let canLeft = false;
      let canRight = false;
      
      if (language === 'ar') {
        canRight = Math.abs(currentScrollLeft) > EPSILON;
        canLeft = Math.abs(currentScrollLeft) + clientWidth < scrollWidth - EPSILON;
      } else {
        canLeft = currentScrollLeft > EPSILON;
        canRight = currentScrollLeft + clientWidth < scrollWidth - EPSILON;
      }
      
      setScrollState({ canScrollLeft: canLeft, canScrollRight: canRight });
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (ref.current && e.deltaY !== 0) {
        e.preventDefault();
        ref.current.scrollBy({
          left: e.deltaY > 0 ? 100 : -100,
          behavior: 'auto'
        });
      }
    };

    const currentRef = ref.current;
    if (currentRef) {
      // Keep the initial position stable on LTR to avoid tiny auto-offset on mobile.
      if (language !== 'ar') {
        currentRef.scrollLeft = 0;
      }
      currentRef.addEventListener('wheel', handleWheel, { passive: false });
    }

    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('wheel', handleWheel);
      }
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
    const walk = (x - startX) * 2; // Scroll-fast
    ref.current.scrollLeft = scrollLeft - walk;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return {
    ref,
    scrollState,
    scroll,
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
