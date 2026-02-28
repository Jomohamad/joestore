import { Link } from 'react-router-dom';
import { Gamepad2, Twitter, Facebook, Instagram, Youtube, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Footer() {
  const { t, language } = useStore();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-creo-bg border-t border-creo-border pt-16 md:pt-24 pb-8 mt-auto relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-creo-accent/5 to-transparent pointer-events-none"></div>
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Premium Newsletter Section */}
        <div className="bg-creo-card border border-creo-border rounded-3xl p-8 md:p-12 mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-creo-accent/10 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="max-w-xl text-center md:text-left">
              <h3 className="text-2xl md:text-4xl font-display font-bold text-white mb-3">{t('newsletter_title')}</h3>
              <p className="text-sm md:text-base text-creo-text-sec">{t('newsletter_desc')}</p>
            </div>
            <form className="w-full md:w-auto flex-1 max-w-md flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input 
                  type="email" 
                  placeholder={t('email_placeholder')}
                  className="w-full bg-creo-bg border border-creo-border rounded-xl px-4 py-4 text-sm text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all pl-12"
                />
                <Send className={`absolute ${language === 'en' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-creo-muted`} />
              </div>
              <button 
                type="submit"
                className="bg-gradient-to-r from-creo-accent to-creo-accent-sec hover:from-white hover:to-white text-black px-8 py-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:-translate-y-1"
              >
                {t('subscribe')}
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <Link to="/" onClick={handleScrollToTop} className="flex items-center gap-2 text-creo-accent mb-4 md:mb-6">
              <Gamepad2 className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">
                GameCurrency
              </span>
            </Link>
            <p className="text-sm text-creo-text-sec leading-relaxed mb-6">
              {t('hero_desc')}
            </p>
            <div className="flex items-center gap-4 text-creo-text-sec">
              <a href="#" className="w-10 h-10 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Twitter className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-display font-semibold mb-4 md:mb-6 uppercase tracking-wider text-sm md:text-base">{t('support')}</h3>
            <ul className="space-y-3 md:space-y-4 text-sm text-creo-text-sec font-medium">
              <li><Link to="/contact" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('contact_us')}</Link></li>
              <li><Link to="/faq" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('faq')}</Link></li>
              <li><Link to="/payment-methods" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('payment_methods')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-display font-semibold mb-4 md:mb-6 uppercase tracking-wider text-sm md:text-base">{t('legal')}</h3>
            <ul className="space-y-3 md:space-y-4 text-sm text-creo-text-sec font-medium">
              <li><Link to="/terms" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('terms')}</Link></li>
              <li><Link to="/privacy" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('privacy')}</Link></li>
              <li><Link to="/refund" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('refund')}</Link></li>
            </ul>
          </div>
          
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="text-white font-display font-semibold mb-4 md:mb-6 uppercase tracking-wider text-sm md:text-base">{t('quick_links')}</h3>
            <ul className="space-y-3 md:space-y-4 text-sm text-creo-text-sec font-medium">
              <li><Link to="/games" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('games')}</Link></li>
              <li><Link to="/apps" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('apps')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-creo-border pt-6 md:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-creo-muted text-center sm:text-left font-medium">
            &copy; {new Date().getFullYear()} GameCurrency. {t('rights_reserved')}
          </p>
          <div className="flex items-center gap-4 text-xs md:text-sm text-creo-muted font-medium">
            <span>{language === 'en' ? 'English' : 'العربية'}</span>
            <span>{t('egp')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
