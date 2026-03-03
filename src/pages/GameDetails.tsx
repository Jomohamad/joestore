import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { fetchGameDetails, fetchGamePackages } from '../services/api';
import { Game, Package } from '../types';
import { ShieldCheck, CheckCircle2, X, Minus, Plus } from 'lucide-react';
import { imgSrc } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, t, language, formatPrice, getCartQuantity, incrementCartItem, decrementCartItem } = useStore();

  const [game, setGame] = useState<Game | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [gameData, packagesData] = await Promise.all([fetchGameDetails(id), fetchGamePackages(id)]);
        setGame(gameData);
        setPackages(packagesData);
      } catch {
        setError(t('failed_load_details'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, t]);

  const handleIncrement = (pkg: Package) => {
    if (!game) return;

    if (!user) {
      setShowLoginError(true);
      setTimeout(() => setShowLoginError(false), 3500);
      return;
    }

    const quantity = getCartQuantity(game.id, pkg.id);
    if (quantity > 0) {
      incrementCartItem(game.id, pkg.id);
    } else {
      addToCart({
        gameId: game.id,
        gameName: game.name,
        gameImage: game.image_url,
        packageId: pkg.id,
        packageName: `${pkg.amount} ${game.currency_name}`,
        packageAmount: pkg.amount,
        currency: game.currency_name,
        unitPrice: pkg.price,
        packageImage: pkg.image_url || null,
      });
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1600);
  };

  const handleDecrement = (pkg: Package) => {
    if (!game || !user) return;
    decrementCartItem(game.id, pkg.id);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || t('game_not_found')}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-creo-bg-sec hover:bg-creo-border text-white rounded-lg transition-colors">
            {t('back_to_home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg pb-20 md:pb-24 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-creo-card border border-creo-accent/50 rounded-2xl p-4 shadow-2xl shadow-creo-accent/20 flex items-center gap-3">
              <div className="w-9 h-9 bg-creo-accent rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-black" />
              </div>
              <p className="text-sm text-white font-semibold">{t('added_to_cart')}</p>
              <button onClick={() => setShowSuccess(false)} className="ml-auto text-creo-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginError && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-creo-card border border-red-500/50 rounded-2xl p-4 shadow-2xl shadow-red-500/10 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-white">{language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first'}</p>
              <button onClick={() => setShowLoginError(false)} className="ml-auto text-creo-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-creo-bg-sec/50 via-creo-bg/80 to-creo-bg z-10" />
        <img src={imgSrc(game.image_url)} alt={game.name} className="w-full h-full object-cover opacity-40 blur-sm" referrerPolicy="no-referrer" />
        <div className="absolute bottom-0 left-0 w-full z-20 pb-6 md:pb-8">
          <div className="container mx-auto px-4 flex items-end gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-creo-bg shadow-2xl shrink-0 bg-creo-bg-sec">
              <img src={imgSrc(game.image_url)} alt={game.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="mb-1 md:mb-2 flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-1 md:mb-2">{game.name}</h1>
              <div className="text-xs md:text-sm text-creo-text-sec italic">{game.publisher}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 md:mt-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">{t('select_package')}</h2>

        <div className="space-y-3 md:space-y-4">
          {packages.map((pkg) => {
            const quantity = getCartQuantity(game.id, pkg.id);
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-creo-card border border-creo-border rounded-2xl p-3 md:p-4 flex items-center justify-between gap-3 md:gap-4 hover:border-creo-accent/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-28 md:w-36 aspect-video rounded-xl overflow-hidden bg-creo-bg-sec border border-creo-border shrink-0">
                    <img src={imgSrc(pkg.image_url || game.image_url)} alt={`${game.name} package`} className="w-full h-full object-fill" referrerPolicy="no-referrer" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-white font-bold text-sm md:text-base line-clamp-1">{pkg.amount} {game.currency_name}</h3>
                    <p className="text-creo-accent text-xs md:text-sm font-semibold mt-1">{formatPrice(pkg.price)}</p>
                    {pkg.bonus > 0 && <p className="text-[11px] text-creo-text-sec mt-1">+{pkg.bonus} {t('bonus')}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDecrement(pkg)}
                    disabled={quantity === 0}
                    className="w-9 h-9 rounded-lg border border-creo-border flex items-center justify-center hover:border-creo-accent disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="w-8 text-center font-bold text-white">{quantity}</span>

                  <button
                    onClick={() => handleIncrement(pkg)}
                    className="w-9 h-9 rounded-lg border border-creo-border flex items-center justify-center hover:border-creo-accent"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
