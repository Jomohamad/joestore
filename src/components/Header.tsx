import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Search, ShoppingCart, Menu, Clock, X, User, LogOut, Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Header() {
  const { language, toggleLanguage, cart, wishlist, t } = useStore();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse recent searches', e);
      return [];
    }
  });
  const [showRecent, setShowRecent] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowRecent(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recentSearches' && e.newValue) {
        try {
          setRecentSearches(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse recent searches from storage event', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    setShowRecent(false);
    
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const removeRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const newRecent = recentSearches.filter(s => s !== term);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-creo-border bg-creo-bg/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/" className="flex items-center gap-2 text-creo-accent hover:text-creo-accent-sec transition-colors">
              <Gamepad2 className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-xl md:text-2xl font-display font-bold tracking-tight text-white hidden sm:block">
                GameCurrency
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-creo-text-sec uppercase tracking-wider">
              <Link to="/" className="hover:text-creo-accent transition-colors">{t('home')}</Link>
              <Link to="/support" className="hover:text-creo-accent transition-colors">{t('support')}</Link>
            </nav>
          </div>

            <div className="flex items-center gap-3 md:gap-5">
              <div className="relative hidden lg:block" ref={searchContainerRef}>
                <Search className={`absolute ${language === 'en' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-creo-muted pointer-events-none`} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowRecent(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('search')}
                  className={`bg-creo-bg-sec border border-creo-border rounded-full py-2 ${language === 'en' ? 'pl-10 pr-4' : 'pr-10 pl-4'} text-sm text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent w-48 xl:w-64 transition-all`}
                />
                
                {showRecent && recentSearches.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-creo-card border border-creo-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 text-[10px] font-bold text-creo-text-sec uppercase tracking-wider border-b border-creo-border/50 bg-creo-bg-sec/30">
                      {language === 'en' ? 'Recent Searches' : 'عمليات البحث الأخيرة'}
                    </div>
                    {recentSearches.map((term, i) => (
                      <div 
                        key={i}
                        onClick={() => {
                          setSearchQuery(term);
                          handleSearch(term);
                        }}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-creo-bg-sec cursor-pointer group transition-colors border-b border-creo-border/10 last:border-0"
                      >
                        <div className="flex items-center gap-3 text-sm text-creo-text group-hover:text-white transition-colors">
                          <Clock className="w-3.5 h-3.5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                          {term}
                        </div>
                        <button 
                          onClick={(e) => removeRecent(e, term)}
                          className="text-creo-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-creo-bg rounded-full"
                          aria-label="Remove search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
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

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
