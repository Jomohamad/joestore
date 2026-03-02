import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function OrderToast() {
  const { orderToast, clearOrderToast, t, language } = useStore();

  if (!orderToast) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      >
        <div className="bg-creo-card border border-creo-accent/50 rounded-2xl p-4 shadow-2xl shadow-creo-accent/20 flex items-center gap-4 backdrop-blur-xl">
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm">
              {t('order_placed').replace('{id}', orderToast.orderId)}
            </h4>
          </div>
          <button
            onClick={clearOrderToast}
            className="p-1 text-creo-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
