import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Globe, History, LogOut, User, DollarSign, LogIn, ShieldCheck, Edit, Trash2, UserPlus, Headset, LayoutDashboard } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import DeleteAccountModal from './modals/DeleteAccountModal';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t, language, toggleLanguage, currency, toggleCurrency, wishlist } = useStore();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isAdminByTable, setIsAdminByTable] = useState(false);

  const username = profile?.username || user?.user_metadata?.username;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const isAdmin = Boolean(profile?.is_admin || isAdminByTable);
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.user_metadata?.full_name || user?.email || t('guest');

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  useEffect(() => {
    let active = true;
    const checkAdminMembership = async () => {
      if (!user?.id) {
        if (active) setIsAdminByTable(false);
        return;
      }

      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setIsAdminByTable(false);
        return;
      }
      setIsAdminByTable(Boolean(data?.user_id));
    };

    void checkAdminMembership();
    return () => {
      active = false;
    };
  }, [user?.id, profile?.is_admin]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ x: language === 'ar' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: language === 'ar' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                'fixed top-0 bottom-0 w-80 bg-creo-card border-r border-creo-border z-50 shadow-2xl flex flex-col',
                language === 'ar' ? 'right-0 border-l border-r-0' : 'left-0',
              )}
            >
              <div className="p-6 border-b border-creo-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-creo-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-creo-accent/10 flex items-center justify-center text-creo-accent">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    <p className="text-xs text-creo-text-sec">{user ? t('welcome_back') : t('login_desc')}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-creo-muted hover:text-white hover:bg-creo-bg-sec rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {user && (
                  <div className="space-y-1">
                    <p className="px-4 text-[10px] font-bold text-creo-muted uppercase tracking-widest mb-2">{t('my_account')}</p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => goTo('/dashboard')}
                        className="w-full text-left flex items-center gap-3 px-4 py-3 text-black bg-creo-accent hover:bg-[#ffe04d] rounded-xl transition-colors group shadow-[0_0_22px_rgba(255,215,0,0.25)]"
                      >
                        <span className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center">
                          <LayoutDashboard className="w-4 h-4" />
                        </span>
                        <span className="font-medium">{t('dashboard')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => goTo('/edit-profile')}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group"
                    >
                      <Edit className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                      <span className="font-medium">{t('edit_profile')}</span>
                    </button>

                    <Link to="/wishlist" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group">
                      <Heart className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                      <span className="font-medium">{t('wishlist')}</span>
                      {wishlist.length > 0 && (
                        <span className="ml-auto bg-creo-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{wishlist.length}</span>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={() => goTo('/orders')}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group"
                    >
                      <History className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                      <span className="font-medium">{t('order_history')}</span>
                    </button>

                    <Link to="/payment-methods" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group">
                      <DollarSign className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                      <span className="font-medium">{t('payment_methods')}</span>
                    </Link>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="px-4 text-[10px] font-bold text-creo-muted uppercase tracking-widest mb-2">{t('settings')}</p>
                  <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group text-left"
                  >
                    <Globe className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                    <span className="font-medium">{t('language')}</span>
                    <span className="ml-auto text-[10px] font-bold text-creo-accent bg-creo-accent/10 px-2 py-1 rounded">{language === 'en' ? 'English' : 'العربية'}</span>
                  </button>

                  <button
                    onClick={toggleCurrency}
                    className="w-full flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group text-left"
                  >
                    <DollarSign className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                    <span className="font-medium">{t('currency')}</span>
                    <span className="ml-auto text-[10px] font-bold text-creo-accent bg-creo-accent/10 px-2 py-1 rounded">{currency === 'USD' ? 'USD' : 'EGP'}</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="px-4 text-[10px] font-bold text-creo-muted uppercase tracking-widest mb-2">{t('more')}</p>
                  <Link to="/why-choose-us" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group">
                    <ShieldCheck className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                    <span className="font-medium">{t('features_title')}</span>
                  </Link>
                  <Link to="/support" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-creo-text hover:text-white hover:bg-creo-bg-sec rounded-xl transition-colors group">
                    <Headset className="w-5 h-5 text-creo-muted group-hover:text-creo-accent transition-colors" />
                    <span className="font-medium">{t('support')}</span>
                  </Link>
                </div>
              </div>

              <div className="p-4 border-t border-creo-border space-y-2">
                {user && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="font-medium">{t('delete_account')}</span>
                  </button>
                )}

                {user ? (
                  <button
                    onClick={async () => {
                      try {
                        await signOut();
                      } finally {
                        navigate('/login');
                      }
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">{t('logout')}</span>
                  </button>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      onClick={onClose}
                      className="w-full flex items-center gap-3 px-4 py-3 text-creo-accent hover:text-black hover:bg-creo-accent rounded-xl transition-colors"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span className="font-medium">{t('signup')}</span>
                    </Link>
                    <Link
                      to="/login"
                      onClick={onClose}
                      className="w-full flex items-center gap-3 px-4 py-3 text-creo-text hover:text-black hover:bg-creo-accent rounded-xl transition-colors"
                    >
                      <LogIn className="w-5 h-5" />
                      <span className="font-medium">{t('login')}</span>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} username={username} />
    </>
  );
}
