import { useEffect } from 'react';
import { prefetchRouteModule } from '../lib/prefetchRoutes';

const prefetched = new Set<string>();
let scheduledCount = 0;
const MAX_PREFETCH = 40;

const supportsAggressivePrefetch = () => {
  const nav = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const conn = nav.connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  const type = String(conn.effectiveType || '').toLowerCase();
  if (type.includes('2g')) return false;
  return true;
};

const getInternalHref = (value: string | null) => {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('/api')) return null;
  return value;
};

const addPrefetchTag = (href: string) => {
  const abs = new URL(href, window.location.origin).toString();
  if (prefetched.has(abs)) return;
  if (scheduledCount >= MAX_PREFETCH) return;

  prefetched.add(abs);
  scheduledCount += 1;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = abs;
  link.as = 'document';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);

  prefetchRouteModule(href);
};

export const useSmartPrefetch = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!supportsAggressivePrefetch()) return;

    const schedule = (href: string, delay = 120) => {
      window.setTimeout(() => addPrefetchTag(href), delay);
    };

    const fromAnchor = (target: EventTarget | null) => {
      try {
        if (!(target instanceof Node)) return null;
        let current: Node | null = target;

        while (current) {
          if (current instanceof HTMLAnchorElement && current.hasAttribute('href')) {
            return getInternalHref(current.getAttribute('href'));
          }
          current = current.parentNode;
        }
      } catch {
        return null;
      }

      return null;
    };

    const onPointerEnter = (event: Event) => {
      const href = fromAnchor(event.target);
      if (!href) return;
      schedule(href, 80);
    };

    const onTouchStart = (event: Event) => {
      const href = fromAnchor(event.target);
      if (!href) return;
      schedule(href, 20);
    };

    const onFocus = (event: Event) => {
      const href = fromAnchor(event.target);
      if (!href) return;
      schedule(href, 60);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const anchor = entry.target as HTMLAnchorElement;
          const href = getInternalHref(anchor.getAttribute('href'));
          if (href) schedule(href, 180);
        }
      },
      {
        rootMargin: '220px 0px',
        threshold: 0.01,
      },
    );

    const observed = new Set<HTMLAnchorElement>();
    const scanVisibleLinks = () => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]:not([href^="/api"])');
      anchors.forEach((anchor) => {
        if (observed.has(anchor)) return;
        observed.add(anchor);
        observer.observe(anchor);
      });
    };

    scanVisibleLinks();
    const mutation = new MutationObserver(scanVisibleLinks);
    mutation.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('pointerenter', onPointerEnter, true);
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('focusin', onFocus, true);

    return () => {
      mutation.disconnect();
      observer.disconnect();
      document.removeEventListener('pointerenter', onPointerEnter, true);
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('focusin', onFocus, true);
    };
  }, []);
};
