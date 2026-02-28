import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';

export default function Cart() {
  const { cart, removeFromCart, clearCart, t, language } = useStore();

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  if (cart.length === 0) {
    return (
      <div className="flex-1 bg-creo-bg py-12 md:py-20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-creo-bg-sec rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-creo-muted" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">{t('cart_empty')}</h2>
          <p className="text-creo-text-sec mb-8">{t('cart_empty_desc')}</p>
          <Link 
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-creo-accent hover:bg-white text-black rounded-xl font-bold transition-colors w-full sm:w-auto"
          >
            {t('start_shopping')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-8">{t('shopping_cart')}</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-creo-text-sec font-medium">{t('items_count').replace('{count}', cart.length.toString())}</span>
              <button 
                onClick={clearCart}
                className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> {t('clear_cart')}
              </button>
            </div>
            
            {cart.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-creo-card border border-creo-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-creo-bg shrink-0 border border-creo-border">
                  <img src={item.gameImage} alt={item.gameName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{item.gameName}</h3>
                  <p className="text-sm text-creo-accent font-medium mt-1">{item.amount} {item.currency}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-creo-muted">
                    <span className="bg-creo-bg-sec px-2 py-1 rounded">{t('player_id')}: {item.playerId}</span>
                    {item.playerName && <span className="bg-creo-bg-sec px-2 py-1 rounded truncate max-w-[150px]">{item.playerName}</span>}
                  </div>
                </div>
                
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-4 sm:mt-0 gap-4">
                  <span className="text-xl font-bold text-white">{item.price.toFixed(2)} {t('egp')}</span>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-creo-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Order Summary */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="bg-creo-card border border-creo-border rounded-2xl p-6 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-creo-border">{t('order_summary')}</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-creo-text-sec">
                  <span>{t('subtotal')} ({cart.length} {t('item')})</span>
                  <span className="text-white">{total.toFixed(2)} {t('egp')}</span>
                </div>
                <div className="flex justify-between text-creo-text-sec">
                  <span>{t('processing_fee')}</span>
                  <span className="text-white">0.00 {t('egp')}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-creo-border mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-creo-text-sec font-medium">{t('total')}</span>
                  <span className="text-3xl font-bold text-creo-accent">{total.toFixed(2)} {t('egp')}</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  alert(language === 'en' ? 'Checkout functionality would go here!' : 'سيتم إضافة وظيفة إتمام الطلب هنا!');
                  clearCart();
                }}
                className="w-full py-4 bg-creo-accent hover:bg-white text-black rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                {t('checkout')} <ArrowRight className={cn("w-5 h-5", language === 'ar' && "rotate-180")} />
              </button>
              
              <div className="mt-6 flex items-center justify-center gap-4 opacity-50">
                {/* Mock payment icons */}
                <div className="w-10 h-6 bg-white rounded flex items-center justify-center text-[8px] font-bold text-black">VISA</div>
                <div className="w-10 h-6 bg-white rounded flex items-center justify-center text-[8px] font-bold text-black">MC</div>
                <div className="w-10 h-6 bg-white rounded flex items-center justify-center text-[8px] font-bold text-black">PAYPAL</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
