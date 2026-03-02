import { Link } from 'react-router-dom';
import { Gamepad2, Twitter, Facebook, Instagram, Youtube, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Footer() {
  const { t, language } = useStore();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-creo-bg border-t border-creo-border pt-6 pb-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-3">
          <Link to="/" onClick={handleScrollToTop} className="flex flex-col items-center gap-2 text-creo-accent">
            <Gamepad2 className="w-6 h-6" />
            <span className="text-lg font-display font-bold text-white">GameCurrency</span>
          </Link>

          <div className="flex items-center gap-3">
            <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-2 text-center text-[11px] text-creo-muted">
            &copy; {new Date().getFullYear()} GameCurrency. {t('rights_reserved')}
          </div>
        </div>
      </div>
    </footer>
  );
}
