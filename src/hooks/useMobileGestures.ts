import { useEffect } from 'react';
import { useLocation } from '../lib/router';

const HORIZONTAL_THRESHOLD = 70;
const HORIZONTAL_SLOPE_FACTOR = 1.35;
const VERTICAL_REFRESH_THRESHOLD = 95;
const MAX_GESTURE_DURATION_MS = 750;

const findHorizontalScrollableAncestor = (node: HTMLElement | null): HTMLElement | null => {
  let current: HTMLElement | null = node;
  while (current && current !== document.body) {
    if (current.hasAttribute('data-swipe-carousel')) return current;

    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && current.scrollWidth > current.clientWidth + 2;
    if (canScrollX) return current;

    current = current.parentElement;
  }

  return null;
};

const scrollHorizontalContainer = (container: HTMLElement, direction: 'next' | 'prev') => {
  const firstCard = container.querySelector<HTMLElement>('.home-cards-item');
  const cardWidth = firstCard?.getBoundingClientRect().width ?? container.clientWidth * 0.82;
  const styles = window.getComputedStyle(container);
  const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
  const amount = cardWidth + gap;
  const delta = direction === 'next' ? amount : -amount;
  container.scrollBy({ left: delta, behavior: 'smooth' });
};

export function useMobileGestures(enabled: boolean) {
  const location = useLocation();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let startTarget: HTMLElement | null = null;
    let tracking = false;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      tracking = true;
      startTarget = target;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!tracking || event.changedTouches.length !== 1) return;

      tracking = false;
      const duration = Date.now() - startTime;
      if (duration > MAX_GESTURE_DURATION_MS) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const horizontalContainer = findHorizontalScrollableAncestor(startTarget);
      if (horizontalContainer && absX > absY && absX > HORIZONTAL_THRESHOLD) {
        scrollHorizontalContainer(horizontalContainer, deltaX < 0 ? 'next' : 'prev');
        return;
      }

      if (window.scrollY <= 4 && deltaY > VERTICAL_REFRESH_THRESHOLD && absY > absX * 1.2) {
        window.location.reload();
        return;
      }

      if (absX > HORIZONTAL_THRESHOLD && absX > absY * HORIZONTAL_SLOPE_FACTOR) {
        // Intentionally disabled: do not navigate pages on horizontal swipes.
        return;
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, location.pathname]);
}
