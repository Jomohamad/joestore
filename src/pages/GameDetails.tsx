import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '../lib/router';
import { AnimatePresence, motion } from 'motion/react';
import { fetchGameDetails, fetchGamePackages } from '../services/api';
import { Game, Package } from '../types';
import { ShieldCheck, CheckCircle2, X, Minus, Plus, Heart, BadgeCheck } from 'lucide-react';
import { cn, responsiveImageProps } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useSsrData } from '../context/SsrDataContext';

const getDiscountedPrice = (pkg: Package) => {
  const basePrice = Number(pkg.price || 0);
  const hasDiscountWindow = !pkg.discount_ends_at || new Date(pkg.discount_ends_at).getTime() > Date.now();
  const discountActive = Boolean(pkg.discount_active) && Number(pkg.discount_value || 0) > 0 && hasDiscountWindow;

  if (!discountActive) {
    return {
      hasDiscount: false,
      original: basePrice,
      final: basePrice,
    };
  }

  const discountValue = Number(pkg.discount_value || 0);
  const finalPrice =
    pkg.discount_type === 'percent'
      ? Math.max(0, basePrice - basePrice * (discountValue / 100))
      : Math.max(0, basePrice - discountValue);

  return {
    hasDiscount: finalPrice < basePrice,
    original: basePrice,
    final: finalPrice,
  };
};

type GameDetailsProps = {
  initialGame?: Game | null;
  initialPackages?: Package[];
  initialGameIdentifier?: string;
};

export default function GameDetails({ initialGame, initialPackages, initialGameIdentifier }: GameDetailsProps) {
  const { id } = useParams<{ id: string | string[] }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, t, language, formatPrice, isInWishlist, addToWishlist, removeFromWishlist, notifyMessage } = useStore();
  const { gameDetails } = useSsrData();

  const rawId = Array.isArray(id) ? id[0] : id;
  const requestedId = String(initialGameIdentifier || rawId || '').trim();
  const preloaded = requestedId ? gameDetails?.[requestedId] : undefined;
  const effectiveInitialGame = useMemo(() => initialGame || preloaded?.game || null, [initialGame, preloaded]);
  const effectiveInitialPackages = useMemo(() => initialPackages || preloaded?.packages || [], [initialPackages, preloaded]);
  const hasInitialData = Boolean(effectiveInitialGame && (initialGame || preloaded));

  const [game, setGame] = useState<Game | null>(hasInitialData ? effectiveInitialGame : null);
  const [packages, setPackages] = useState<Package[]>(hasInitialData ? effectiveInitialPackages : []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    hasInitialData && effectiveInitialPackages.length ? effectiveInitialPackages[0].id : null,
  );
  const [packageQuantities, setPackageQuantities] = useState<Record<number, number>>(() => {
    if (!hasInitialData || !effectiveInitialPackages.length) return {};
    const seeded: Record<number, number> = {};
    for (const pkg of effectiveInitialPackages) {
      seeded[pkg.id] = 1;
    }
    return seeded;
  });
  const [accountIdentifier, setAccountIdentifier] = useState('');

  useEffect(() => {
    if (!requestedId) return;

    const seedSelection = (rows: Package[]) => {
      if (rows.length === 0) {
        setSelectedPackageId(null);
        setPackageQuantities({});
        return;
      }

      setSelectedPackageId((prev) => prev ?? rows[0].id);
      const initialQuantities: Record<number, number> = {};
      for (const pkg of rows) {
        initialQuantities[pkg.id] = 1;
      }
      setPackageQuantities(initialQuantities);
    };

    if (hasInitialData && effectiveInitialGame) {
      setGame(effectiveInitialGame);
      setPackages(effectiveInitialPackages);
      seedSelection(effectiveInitialPackages);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [gameData, packagesData] = await Promise.all([fetchGameDetails(requestedId), fetchGamePackages(requestedId)]);
        setGame(gameData);
        setPackages(packagesData);
        seedSelection(packagesData);
      } catch {
        setError(t('failed_load_details'));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [requestedId, t, hasInitialData, effectiveInitialGame, effectiveInitialPackages]);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackageId) || null,
    [packages, selectedPackageId],
  );

  const selectedQuantity = selectedPackage ? packageQuantities[selectedPackage.id] ?? 1 : 1;

  const handleQuantityChange = (pkgId: number, delta: number) => {
    setPackageQuantities((prev) => {
      const current = prev[pkgId] ?? 1;
      return {
        ...prev,
        [pkgId]: Math.max(1, current + delta),
      };
    });
  };

  const handleConfirmAddToCart = () => {
    if (!game || !selectedPackage) {
      return;
    }

    if (!user) {
      setShowLoginError(true);
      setTimeout(() => setShowLoginError(false), 3500);
      return;
    }

    if (!accountIdentifier.trim()) {
      notifyMessage(language === 'ar' ? 'من فضلك أدخل الـ ID أولاً' : 'Please enter account ID first');
      return;
    }

    const pricing = getDiscountedPrice(selectedPackage);

    addToCart({
      gameId: game.id,
      gameName: game.name,
      gameImage: game.image_url,
      packageId: selectedPackage.id,
      packageName: `${selectedPackage.amount} ${game.currency_name}`,
      packageAmount: selectedPackage.amount,
      currency: game.currency_name,
      unitPrice: pricing.final,
      originalUnitPrice: pricing.original,
      accountIdentifier: accountIdentifier.trim(),
      packageImage: selectedPackage.image_url || null,
      quantity: selectedQuantity,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1600);
  };

  const toggleWishlist = () => {
    if (!game) return;
    if (isInWishlist(game.id)) {
      removeFromWishlist(game.id);
    } else {
      addToWishlist(game);
    }
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
    <div className="flex-1 bg-creo-bg pb-32 md:pb-24 relative">
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
        <img {...responsiveImageProps(game.image_url, { kind: 'hero', lazy: false })} alt={game.name} className="w-full h-full object-cover opacity-40 blur-sm" referrerPolicy="no-referrer" />
        <div className="absolute bottom-0 left-0 w-full z-20 pb-6 md:pb-8">
          <div className="container mx-auto px-4 flex items-end gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-creo-bg shadow-2xl shrink-0 bg-creo-bg-sec">
              <img {...responsiveImageProps(game.image_url, { kind: 'cover' })} alt={game.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="mb-1 md:mb-2 flex-1">
              <h1 className="text-[clamp(1.35rem,3.8vw,2.6rem)] font-display font-bold text-white mb-1 md:mb-2">{game.name}</h1>
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-creo-text-sec italic">
                <span>{game.publisher}</span>
                <BadgeCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-creo-accent not-italic" />
              </div>
            </div>
            <button
              onClick={toggleWishlist}
              className="mb-1 md:mb-2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/45 border border-creo-border text-white flex items-center justify-center hover:border-creo-accent hover:bg-creo-accent/20 transition-colors shrink-0"
              aria-label={isInWishlist(game.id) ? t('remove_from_wishlist') : t('add_to_wishlist')}
            >
              <Heart className={isInWishlist(game.id) ? 'w-5 h-5 fill-creo-accent text-creo-accent' : 'w-5 h-5'} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 md:mt-12">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-10 items-start">
          <aside className="lg:sticky lg:top-5 self-start mb-8 lg:mb-0 space-y-4">
            <div className="rounded-2xl border border-creo-border bg-creo-card p-4 md:p-5">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{game.name}</h2>
              <p className="text-sm md:text-base text-creo-text-sec">
                {game.description || (language === 'ar' ? 'لا يوجد وصف متاح حالياً.' : 'No description available right now.')}
              </p>
            </div>

            <div className="rounded-2xl border border-creo-border bg-creo-card p-4 md:p-5 space-y-3">
              <label className="block text-sm font-semibold text-white">{language === 'ar' ? 'ID' : 'ID'}</label>
              <input
                type="text"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب ID الحساب' : 'Enter account/player ID'}
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-creo-accent"
              />

              {selectedPackage && (
                <div className="text-xs text-creo-text-sec">
                  {language === 'ar' ? 'الباقة المختارة:' : 'Selected package:'}{' '}
                  <span className="text-white">{selectedPackage.amount} {game.currency_name}</span>
                  <span className="mx-1">x</span>
                  <span className="text-white">{selectedQuantity}</span>
                </div>
              )}

              <button
                onClick={handleConfirmAddToCart}
                className="hidden md:block w-full min-h-12 bg-creo-accent hover:bg-white text-black font-bold py-3 rounded-xl transition-colors"
              >
                {language === 'ar' ? 'تأكيد الإضافة للسلة' : 'Confirm Add to Cart'}
              </button>
            </div>
          </aside>

          <section className="lg:col-span-2">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">{t('select_package')}</h3>

            {packages.length === 0 ? (
              <div className="rounded-2xl border border-creo-border bg-creo-card px-4 py-6 text-center text-creo-text-sec">
                {language === 'ar' ? 'لا توجد باقات متاحة لهذا المنتج حالياً.' : 'No packages available for this product right now.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {packages.map((pkg) => {
                  const quantity = packageQuantities[pkg.id] ?? 1;
                  const pricing = getDiscountedPrice(pkg);
                  const selected = selectedPackageId === pkg.id;

                  return (
                    <motion.button
                      key={pkg.id}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={cn(
                        'text-left bg-creo-card border rounded-2xl p-3 md:p-4 hover:border-creo-accent/70 transition-colors',
                        selected ? 'border-creo-accent shadow-[0_0_0_1px_rgba(255,215,0,0.35)]' : 'border-creo-border',
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-24 md:w-28 aspect-video rounded-xl overflow-hidden bg-creo-bg-sec border border-creo-border shrink-0">
                          <img {...responsiveImageProps(pkg.image_url || game.image_url, { kind: 'card' })} alt={`${game.name} package`} className="w-full h-full object-fill" referrerPolicy="no-referrer" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-white font-bold text-sm md:text-base line-clamp-1">
                            {pkg.amount} {game.currency_name}{' '}
                            {pkg.bonus > 0 && (
                              <span className="text-creo-accent">+ {pkg.bonus} {t('bonus')}</span>
                            )}
                          </h4>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            {pricing.hasDiscount ? (
                              <>
                                <span className="text-creo-accent text-sm md:text-base font-bold">{formatPrice(pricing.final)}</span>
                                <span className="text-white/80 text-xs md:text-sm line-through">{formatPrice(pricing.original)}</span>
                              </>
                            ) : (
                              <span className="text-creo-accent text-sm md:text-base font-bold">{formatPrice(pricing.final)}</span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(pkg.id, -1);
                              }}
                              className="w-11 h-11 md:w-9 md:h-9 rounded-lg border border-creo-border flex items-center justify-center hover:border-creo-accent"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="w-8 text-center font-bold text-white">{quantity}</span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(pkg.id, 1);
                              }}
                              className="w-11 h-11 md:w-9 md:h-9 rounded-lg border border-creo-border flex items-center justify-center hover:border-creo-accent"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-creo-border bg-creo-card/95 backdrop-blur-md px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
        <div className="container mx-auto space-y-2">
          <p className="text-xs text-creo-text-sec">
            {language === 'ar' ? 'الباقة المختارة' : 'Selected'}:{' '}
            <span className="text-white font-semibold">
              {selectedPackage ? `${selectedPackage.amount} ${game.currency_name} x ${selectedQuantity}` : '-'}
            </span>
          </p>
          <button
            onClick={handleConfirmAddToCart}
            className="w-full min-h-12 rounded-xl bg-creo-accent hover:bg-white text-black font-bold transition-colors"
          >
            {language === 'ar' ? 'اشحن الآن' : 'Top Up Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
