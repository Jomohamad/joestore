const prefetchedModules = new Set<string>();

const matchers: Array<{ key: string; test: (path: string) => boolean; loader: () => Promise<unknown> }> = [
  { key: 'home', test: (p) => p === '/', loader: () => import('../pages/Home') },
  { key: 'game-details', test: (p) => p.startsWith('/game/'), loader: () => import('../pages/GameDetails') },
  { key: 'games', test: (p) => p === '/games', loader: () => import('../pages/GamesCatalog') },
  { key: 'apps', test: (p) => p === '/apps', loader: () => import('../pages/AppsCatalog') },
  { key: 'cart', test: (p) => p === '/cart', loader: () => import('../pages/Cart') },
  { key: 'orders', test: (p) => p === '/orders', loader: () => import('../pages/Orders') },
  { key: 'search', test: (p) => p.startsWith('/search'), loader: () => import('../pages/SearchPage') },
  { key: 'wishlist', test: (p) => p === '/wishlist', loader: () => import('../pages/Wishlist') },
  { key: 'support', test: (p) => p === '/support' || p === '/contact', loader: () => import('../pages/Support') },
  { key: 'faq', test: (p) => p === '/faq', loader: () => import('../pages/FAQ') },
  { key: 'payment-methods', test: (p) => p === '/payment-methods', loader: () => import('../pages/PaymentMethods') },
  { key: 'dashboard', test: (p) => p === '/dashboard', loader: () => import('../pages/Dashboard') },
];

const normalizePath = (href: string) => {
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname + url.search;
  } catch {
    return href;
  }
};

export const prefetchRouteModule = (href: string) => {
  const path = normalizePath(href);
  const match = matchers.find((m) => m.test(path));
  if (!match) return;
  if (prefetchedModules.has(match.key)) return;

  prefetchedModules.add(match.key);
  void match.loader().catch(() => {
    prefetchedModules.delete(match.key);
  });
};
