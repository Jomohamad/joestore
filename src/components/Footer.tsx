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
    <footer className="bg-creo-bg border-t border-creo-border pt-8 pb-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="space-y-3">
            <Link to="/" onClick={handleScrollToTop} className="inline-flex items-center gap-3 text-creo-accent">
              <img src="/logo.png" alt="JOEStore logo" className="w-9 h-9 object-contain" />
              <BrandWordmark className="text-lg" animated={false} />
            </Link>
            <p className="text-xs text-creo-muted max-w-xs">
              {language === 'ar' ? 'منصة شحن ألعاب وتطبيقات رقمية بسرعة وأمان.' : 'Fast and secure digital top-up platform for games and apps.'}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">{language === 'ar' ? 'الأقسام' : 'Sections'}</h3>
            <div className="flex flex-col gap-1.5 text-sm text-creo-text-sec">
              <Link to="/games" className="hover:text-creo-accent transition-colors">{language === 'ar' ? 'الألعاب' : 'Games'}</Link>
              <Link to="/apps" className="hover:text-creo-accent transition-colors">{language === 'ar' ? 'التطبيقات' : 'Apps'}</Link>
              <Link to="/wishlist" className="hover:text-creo-accent transition-colors">{t('wishlist')}</Link>
              <Link to="/orders" className="hover:text-creo-accent transition-colors">{t('order_history')}</Link>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">{language === 'ar' ? 'الدعم' : 'Support'}</h3>
            <div className="flex flex-col gap-1.5 text-sm text-creo-text-sec">
              <Link to="/support" className="hover:text-creo-accent transition-colors">{t('support')}</Link>
              <Link to="/faq" className="hover:text-creo-accent transition-colors">{language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</Link>
              <Link to="/terms" className="hover:text-creo-accent transition-colors">{t('terms')}</Link>
              <Link to="/privacy" className="hover:text-creo-accent transition-colors">{t('privacy')}</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">{language === 'ar' ? 'تابعنا' : 'Follow Us'}</h3>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Twitter" className="w-10 h-10 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-creo-muted">&copy; {new Date().getFullYear()} JOEStore. {t('rights_reserved')}</p>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-creo-border text-center text-[11px] text-creo-muted">
          {language === 'ar' ? 'متوافق مع جميع أحجام الشاشات.' : 'Optimized for all device sizes.'}
        </div>
      </div>
    </footer>
  );
}
