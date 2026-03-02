import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Header() {
  const { language, toggleLanguage, cart, wishlist, t } = useStore();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-creo-border bg-creo-bg/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3 md:gap-6">
            <Link to="/" className="flex-shrink-0 flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
              <img src="/logo.png" alt="GameCurrency logo" className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-full bg-creo-accent/10 p-1 border border-creo-border shadow-sm group-hover:shadow-lg group-hover:border-creo-accent transition-all duration-300" />
              <span className="hidden md:inline text-lg md:text-xl font-display font-bold tracking-tight text-white group-hover:text-creo-accent transition-colors duration-300">GameCurrency</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-creo-text-sec uppercase tracking-wider">
              {/* nav items removed per design */}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            {/* Mobile: Search Icon (opens overlay) */}
            <div className="md:hidden">
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="p-2 text-creo-text-sec hover:text-creo-accent transition-colors flex-shrink-0"
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

            <Link to="/cart" className="p-2 text-creo-text-sec hover:text-creo-accent transition-colors relative">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-creo-accent text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* User Avatar / Sidebar Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 rounded-full bg-creo-bg-sec border border-creo-border flex items-center justify-center overflow-hidden hover:border-creo-accent transition-colors focus:outline-none focus:ring-2 focus:ring-creo-accent focus:ring-offset-2 focus:ring-offset-creo-bg"
            >
              {user?.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
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
