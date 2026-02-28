import { Link } from 'react-router-dom';
import { Gamepad2, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 pt-16 pb-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-emerald-500 mb-6">
              <Gamepad2 className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight text-white">
                GameCurrency
              </span>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              The fastest and most secure way to buy game credits and vouchers. Trusted by millions of gamers worldwide.
            </p>
            <div className="flex items-center gap-4 text-zinc-400">
              <a href="#" className="hover:text-emerald-500 transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="hover:text-emerald-500 transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-emerald-500 transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="hover:text-emerald-500 transition-colors"><Youtube className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Support</h3>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Payment Methods</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Track Order</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Legal</h3>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Refund Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Settings</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Newsletter</h3>
            <p className="text-sm text-zinc-400 mb-4">Subscribe to get special offers and updates.</p>
            <form className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 flex-1"
              />
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} GameCurrency. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>English (US)</span>
            <span>USD ($)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
