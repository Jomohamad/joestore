import { Link } from 'react-router-dom';
import { Gamepad2, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-creo-bg border-t border-creo-border pt-12 md:pt-16 pb-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-creo-accent mb-4 md:mb-6">
              <Gamepad2 className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-xl md:text-2xl font-display font-bold tracking-tight text-white">
                GameCurrency
              </span>
            </Link>
            <p className="text-sm text-creo-text-sec leading-relaxed mb-6">
              The fastest and most secure way to buy game credits and vouchers. Trusted by millions of gamers worldwide.
            </p>
            <div className="flex items-center gap-4 text-creo-text-sec">
              <a href="#" className="hover:text-creo-accent transition-colors"><Twitter className="w-4 h-4 md:w-5 md:h-5" /></a>
              <a href="#" className="hover:text-creo-accent transition-colors"><Facebook className="w-4 h-4 md:w-5 md:h-5" /></a>
              <a href="#" className="hover:text-creo-accent transition-colors"><Instagram className="w-4 h-4 md:w-5 md:h-5" /></a>
              <a href="#" className="hover:text-creo-accent transition-colors"><Youtube className="w-4 h-4 md:w-5 md:h-5" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-display font-semibold mb-4 md:mb-6 uppercase tracking-wider text-sm md:text-base">Support</h3>
            <ul className="space-y-3 md:space-y-4 text-sm text-creo-text-sec font-medium">
              <li><Link to="/contact" className="hover:text-creo-accent transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-creo-accent transition-colors">FAQ</Link></li>
              <li><Link to="/payment-methods" className="hover:text-creo-accent transition-colors">Payment Methods</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-display font-semibold mb-4 md:mb-6 uppercase tracking-wider text-sm md:text-base">Legal</h3>
            <ul className="space-y-3 md:space-y-4 text-sm text-creo-text-sec font-medium">
              <li><Link to="/terms" className="hover:text-creo-accent transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-creo-accent transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund" className="hover:text-creo-accent transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="text-white font-display font-semibold mb-4 md:mb-6 uppercase tracking-wider text-sm md:text-base">Newsletter</h3>
            <p className="text-sm text-creo-text-sec mb-4">Subscribe to get special offers and updates.</p>
            <form className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2 md:px-4 text-sm text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent flex-1 min-w-0"
              />
              <button 
                type="submit"
                className="bg-creo-accent hover:bg-white text-black px-3 py-2 md:px-4 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-creo-border pt-6 md:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-creo-muted text-center sm:text-left font-medium">
            &copy; {new Date().getFullYear()} GameCurrency. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs md:text-sm text-creo-muted font-medium">
            <span>English (US)</span>
            <span>USD ($)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
