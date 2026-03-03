import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import BrandWordmark from './BrandWordmark';

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
            <img src="/logo.png" alt="JOEStore logo" className="w-9 h-9 object-contain" />
            <BrandWordmark className="text-lg" animated={false} />
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
            &copy; {new Date().getFullYear()} JOEStore. {t('rights_reserved')}
          </div>
        </div>
      </div>
    </footer>
  );
}
