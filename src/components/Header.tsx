import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, ShoppingCart, User, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Header() {
  const { language, toggleLanguage, cart, wishlist, t } = useStore();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/" className="text-creo-accent hover:text-creo-accent-sec transition-colors">
              <Gamepad2 className="w-6 h-6 md:w-8 md:h-8" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-creo-text-sec uppercase tracking-wider">
              <Link to="/" className="hover:text-creo-accent transition-colors">{t('home')}</Link>
              <Link to="/support" className="hover:text-creo-accent transition-colors">{t('support')}</Link>
            </nav>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link to="/" className="text-xl md:text-2xl font-display font-bold tracking-tight text-white hover:text-creo-accent transition-colors">
              GameCurrency
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            {/* search input/button styled similar to provided images */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }}
              className="relative flex items-center flex-1 max-w-xs sm:max-w-md"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('search_games')}
                className={`w-full sm:w-64 bg-creo-bg-sec border border-creo-border rounded-full py-2 px-4 ${language === 'en' ? 'pl-10 pr-4' : 'pr-10 pl-4'} text-sm text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all`}
              />
              <Search className={`absolute ${language === 'en' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-creo-text-sec`} />
              <button
                type="submit"
                className={`${language === 'en' ? 'ml-2' : 'mr-2'} p-2 bg-creo-accent rounded-full text-black hover:bg-creo-accent/90 transition-colors`}
              >
                <Search className="w-4 h-4" />
              </button>
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

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
