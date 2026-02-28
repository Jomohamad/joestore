import { Link } from 'react-router-dom';
import { Gamepad2, Search, ShoppingCart, Menu, Globe } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-creo-border bg-creo-bg/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/" className="flex items-center gap-2 text-creo-accent hover:text-creo-accent-sec transition-colors">
            <Gamepad2 className="w-6 h-6 md:w-8 md:h-8" />
            <span className="text-xl md:text-2xl font-display font-bold tracking-tight text-white hidden sm:block">
              GameCurrency
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-creo-text-sec uppercase tracking-wider">
            <Link to="/" className="hover:text-creo-accent transition-colors">Home</Link>
            <Link to="/games" className="hover:text-creo-accent transition-colors">Games</Link>
            <Link to="/apps" className="hover:text-creo-accent transition-colors">Apps</Link>
            <Link to="/support" className="hover:text-creo-accent transition-colors">Support</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-creo-muted" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-creo-bg-sec border border-creo-border rounded-full py-2 pl-10 pr-4 text-sm text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent w-48 xl:w-64 transition-all"
            />
          </div>
          
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-creo-border hover:border-creo-accent text-creo-text-sec hover:text-creo-accent transition-all text-xs font-bold uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">EN / AR</span>
          </button>
          
          <button className="p-2 text-creo-text-sec hover:text-creo-accent transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-creo-accent rounded-full"></span>
          </button>
          
          <button className="md:hidden p-2 text-creo-text-sec hover:text-creo-accent transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
