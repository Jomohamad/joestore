import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from '../lib/router';
import { ShoppingCart, User, Search, X, Menu, Home, Gamepad2, Grid3X3, Heart, History, Headset } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import BrandWordmark from './BrandWordmark';

export default function Header() {
  const { language, cart, t } = useStore();
  const { user, profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  React.useEffect(() => {
    const closeMobileMenu = () => setIsMobileNavOpen(false);
    window.addEventListener('resize', closeMobileMenu);
    return () => window.removeEventListener('resize', closeMobileMenu);
  }, []);

  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const mobileLinks = [
    { to: '/', label: language === 'ar' ? 'الرئيسية' : 'Home', icon: Home },
    { to: '/games', label: language === 'ar' ? 'الألعاب' : 'Games', icon: Gamepad2 },
    { to: '/apps', label: language === 'ar' ? 'التطبيقات' : 'Apps', icon: Grid3X3 },
    { to: '/wishlist', label: t('wishlist'), icon: Heart },
    { to: '/orders', label: t('order_history'), icon: History },
    { to: '/support', label: t('support'), icon: Headset },
  ];

  const desktopLinks = [
    { to: '/games', label: language === 'ar' ? 'الألعاب' : 'Games' },
    { to: '/apps', label: language === 'ar' ? 'التطبيقات' : 'Apps' },
    { to: '/wishlist', label: t('wishlist') },
    { to: '/support', label: t('support') },
  ];

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-creo-border bg-creo-bg/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="md:hidden p-2 text-creo-text-sec hover:text-creo-accent transition-colors rounded-lg border border-creo-border bg-creo-bg-sec/70"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileNavOpen}
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex-shrink-0 flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="JOEStore logo"
                  className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-lg p-0.5 shadow-[0_0_18px_rgba(255,215,0,0.2)] group-hover:shadow-[0_0_24px_rgba(255,215,0,0.35)] transition-all duration-300"
                />
              </div>
              <BrandWordmark className="text-base sm:text-lg md:text-xl transition-colors duration-300" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-5 lg:gap-8 text-sm font-semibold text-creo-text-sec uppercase tracking-wider">
              {desktopLinks.map((item) => (
                <Link key={item.to} to={item.to} className="hover:text-creo-accent transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            {/* Mobile: Search Icon (opens overlay) */}
            <div className="md:hidden">
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="min-h-11 min-w-11 p-2 text-creo-text-sec hover:text-creo-accent transition-colors flex-shrink-0 rounded-lg border border-creo-border bg-creo-bg-sec/70"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop Search Field */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }}
              className={`hidden md:flex relative flex items-center flex-1 min-w-0 max-w-none md:max-w-md`}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('search_games')}
                className={`flex-1 w-full bg-creo-bg-sec border border-creo-border rounded-full py-2 px-4 ${language === 'en' ? 'pl-10 pr-4' : 'pr-10 pl-4'} text-sm text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all`}
              />
              <Search className={`absolute ${language === 'en' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-creo-text-sec`} />
            </form>

            <Link to="/cart" aria-label="Open cart" className="min-h-11 min-w-11 p-2 text-creo-text-sec hover:text-creo-accent transition-colors relative rounded-lg border border-transparent hover:border-creo-border flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-creo-accent text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {/* User Avatar / Sidebar Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open account sidebar"
              className="w-11 h-11 rounded-full bg-creo-bg-sec border border-creo-border flex items-center justify-center overflow-hidden hover:border-creo-accent transition-colors focus:outline-none focus:ring-2 focus:ring-creo-accent focus:ring-offset-2 focus:ring-offset-creo-bg"
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="User avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-creo-muted" />
              )}
            </button>
          </div>
        </div>

      </header>

      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <aside
            className={`absolute top-0 ${language === 'ar' ? 'right-0' : 'left-0'} h-full w-[min(22rem,90vw)] bg-creo-card border-creo-border shadow-2xl ${
              language === 'ar' ? 'border-l' : 'border-r'
            }`}
          >
            <div className="h-16 px-4 border-b border-creo-border flex items-center justify-between">
              <Link
                to="/"
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-2 text-creo-accent"
              >
                <img src="/logo.png" alt="JOEStore logo" className="w-8 h-8 object-contain rounded-md" />
                <BrandWordmark className="text-base" />
              </Link>
              <button
                aria-label="Close menu"
                onClick={() => setIsMobileNavOpen(false)}
                className="min-h-11 min-w-11 rounded-lg border border-creo-border bg-creo-bg-sec text-creo-text-sec hover:text-creo-accent transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="px-4 py-4 grid grid-cols-1 gap-2 overflow-y-auto h-[calc(100%-4rem)]">
              {mobileLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileNavOpen(false)}
                    className="min-h-11 rounded-xl border border-creo-border bg-creo-bg-sec px-3 py-2 text-sm font-semibold text-creo-text-sec hover:text-creo-accent hover:border-creo-accent transition-colors flex items-center gap-2.5"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

          {/* Mobile centered search overlay */}
          {isSearchExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsSearchExpanded(false)}
        >
          <div className="w-full px-4" onClick={(e) => e.stopPropagation()}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
                setIsSearchExpanded(false);
              }}
              className="mx-auto max-w-md relative"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('search_games')}
                className={`w-full bg-creo-bg-sec border border-creo-border rounded-full py-3 px-4 ${language === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} text-sm text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all`}
                autoFocus
              />
              <Search className={`absolute ${language === 'en' ? 'left-6' : 'right-6'} top-1/2 -translate-y-1/2 w-4 h-4 text-creo-text-sec`} />
              <button
                type="button"
                onClick={() => setIsSearchExpanded(false)}
                className="absolute top-2 right-2 p-2 text-creo-text-sec hover:text-white"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
