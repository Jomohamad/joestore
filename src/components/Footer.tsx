import { Link } from 'react-router-dom';
import { Gamepad2, Twitter, Facebook, Instagram, Youtube, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Footer() {
  const { t, language } = useStore();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-creo-bg border-t border-creo-border pt-6 md:pt-8 pb-4 mt-auto relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-creo-accent/5 to-transparent pointer-events-none"></div>
      <div className="container mx-auto px-4 relative z-10">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 mb-6">
          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <Link to="/" onClick={handleScrollToTop} className="flex items-center gap-2 text-creo-accent mb-3 md:mb-4">
              <Gamepad2 className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-lg md:text-xl font-display font-bold tracking-tight text-white">
                GameCurrency
              </span>
            </Link>
            <p className="text-xs text-creo-text-sec leading-relaxed mb-4">
              {t('hero_desc')}
            </p>
            <div className="flex items-center gap-3 text-creo-text-sec">
              <a href="#" className="w-8 h-8 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Twitter className="w-3.5 h-3.5" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Facebook className="w-3.5 h-3.5" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Instagram className="w-3.5 h-3.5" /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-creo-card border border-creo-border flex items-center justify-center hover:bg-creo-accent hover:text-black hover:border-creo-accent transition-all"><Youtube className="w-3.5 h-3.5" /></a>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <h3 className="text-white font-display font-semibold mb-3 md:mb-4 uppercase tracking-wider text-xs md:text-sm">{t('support')}</h3>
            <ul className="space-y-2 md:space-y-3 text-xs text-creo-text-sec font-medium">
              <li><Link to="/contact" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('contact_us')}</Link></li>
              <li><Link to="/faq" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('faq')}</Link></li>
              <li><Link to="/payment-methods" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('payment_methods')}</Link></li>
            </ul>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <h3 className="text-white font-display font-semibold mb-3 md:mb-4 uppercase tracking-wider text-xs md:text-sm">{t('legal')}</h3>
            <ul className="space-y-2 md:space-y-3 text-xs text-creo-text-sec font-medium">
              <li><Link to="/terms" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('terms')}</Link></li>
              <li><Link to="/privacy" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('privacy')}</Link></li>
              <li><Link to="/refund" onClick={handleScrollToTop} className="hover:text-creo-accent transition-colors">{t('refund')}</Link></li>
            </ul>
          </div>
          
          {/* Premium Newsletter Section */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <div className="bg-creo-card border border-creo-border rounded-xl p-4 md:p-5 relative overflow-hidden h-full flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-creo-accent/10 blur-[40px] rounded-full pointer-events-none"></div>
              <div className="relative z-10">
                <h3 className="text-sm md:text-base font-display font-bold text-white mb-1">{t('newsletter_title')}</h3>
                <p className="text-[10px] md:text-xs text-creo-text-sec mb-3">{t('newsletter_desc')}</p>
                <form className="flex flex-col gap-2">
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder={t('email_placeholder')}
                      className="w-full bg-creo-bg border border-creo-border rounded-lg px-3 py-2 text-xs text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all pl-9"
                    />
                    <Send className={`absolute ${language === 'en' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-creo-muted`} />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-creo-accent to-creo-accent-sec hover:from-white hover:to-white text-black px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(255,215,0,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  >
                    {t('subscribe')}
                  </button>
                </form>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-creo-border pt-4 flex items-center justify-center">
          <p className="text-[10px] md:text-xs text-creo-muted text-center font-medium">
            &copy; {new Date().getFullYear()} GameCurrency. {t('rights_reserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
