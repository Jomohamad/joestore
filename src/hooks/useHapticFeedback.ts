import { useEffect } from 'react';

const HAPTIC_TARGET_SELECTOR = 'button, a, [role="button"], [data-haptic]';
const HAPTIC_THROTTLE_MS = 70;
const HAPTIC_DURATION_MS = 10;

export function useHapticFeedback(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    let lastHapticTime = 0;
    let fallbackTimer: number | null = null;
    const supportsVibrate = typeof navigator.vibrate === 'function';

    const handleTap = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(HAPTIC_TARGET_SELECTOR);
      if (!target) return;
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return;

      const now = Date.now();
      if (now - lastHapticTime < HAPTIC_THROTTLE_MS) return;
      lastHapticTime = now;

      if (supportsVibrate) {
        navigator.vibrate(HAPTIC_DURATION_MS);
        return;
      }

      target.classList.remove('haptic-fallback');
      // Force reflow so repeated taps replay the animation.
      void target.offsetWidth;
      target.classList.add('haptic-fallback');

      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      fallbackTimer = window.setTimeout(() => {
        target.classList.remove('haptic-fallback');
      }, 180);
    };

    document.addEventListener('click', handleTap, { passive: true, capture: true });

    return () => {
      document.removeEventListener('click', handleTap, true);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, [enabled]);
}
