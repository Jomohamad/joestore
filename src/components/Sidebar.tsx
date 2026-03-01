import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Globe, History, LogOut, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t, language, toggleLanguage, wishlist } = useStore();
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: language === 'ar' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: language === 'ar' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 bottom-0 w-80 bg-creo-card border-r border-creo-border z-50 shadow-2xl flex flex-col",
              language === 'ar' ? "right-0 border-l border-r-0" : "left-0"
            )}
          >
            <div className="p-6 border-b border-creo-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-creo-accent/10 flex items-center justify-center text-creo-accent">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.email}</p>
                  <p className="text-xs text-creo-text-sec">{t('welcome_back')}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-creo-muted hover:text-white hover:bg-creo-bg-sec rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <Link 
                to="/wishlist" 
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group"
              >
                <Heart className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                <span className="font-medium">{t('wishlist')}</span>
                {wishlist.length > 0 && (
                  <span className="ml-auto bg-creo-accent text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              <Link 
                to="/orders" 
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group"
              >
                <History className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                <span className="font-medium">{t('order_history')}</span>
              </Link>

              <button 
                onClick={toggleLanguage}
                className="w-full flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group text-left"
              >
                <Globe className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                <span className="font-medium">{t('language')}</span>
                <span className="ml-auto text-xs font-bold text-creo-accent bg-creo-accent/10 px-2 py-1 rounded">
                  {language === 'en' ? 'English' : 'العربية'}
                </span>
              </button>
            </div>

            <div className="p-4 border-t border-creo-border">
              <button 
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t('logout')}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
