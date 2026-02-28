import { Link } from 'react-router-dom';
import { Gamepad2, Search, ShoppingCart, Menu } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors">
            <Gamepad2 className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
              GameCurrency
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/games" className="hover:text-white transition-colors">All Games</Link>
            <Link to="/support" className="hover:text-white transition-colors">Support</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search games..." 
              className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 w-64 transition-all"
            />
          </div>
          
          <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
          </button>
          
          <button className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
