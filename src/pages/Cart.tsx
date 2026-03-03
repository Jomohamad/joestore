import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, ShoppingCart, ArrowRight, CreditCard, Tag, AlertCircle, Minus, Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';
import { createOrder, validateCoupon } from '../services/api';

export default function Cart() {
  const { cart, removeFromCart, setCartQuantity, clearCart, t, language, formatPrice, notifyOrder } = useStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: 'percent' | 'fixed'; value: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent' ? subtotal * (appliedCoupon.value / 100) : appliedCoupon.value;
  }

  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;

    if (!/^[A-Z0-9]+$/.test(couponCode)) {
      setCouponError(language === 'ar' ? 'كود الخصم يجب أن يحتوي على حروف وأرقام فقط' : 'Coupon code must contain only letters and numbers');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const result = await validateCoupon(couponCode);
      if (result.valid && result.discountType && result.value) {
        setAppliedCoupon({ code: couponCode, type: result.discountType, value: result.value });
        setCouponCode('');
      } else {
        setCouponError(result.error || 'Invalid coupon');
      }
    } catch {
      setCouponError(language === 'ar' ? 'حدث خطأ أثناء التحقق من الكود' : 'Error validating coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPayment) {
      alert(language === 'ar' ? 'الرجاء اختيار طريقة الدفع' : 'Please select a payment method');
      return;
    }

    setIsCheckingOut(true);
    try {
      for (const item of cart) {
        const res = await createOrder({
          gameId: item.gameId,
          packageId: item.packageId,
          amount: item.packageAmount * item.quantity,
        });

        if (res?.orderId) {
          notifyOrder({ orderId: res.orderId });
        }
      }

      clearCart();
    } catch (error) {
      console.error('Checkout failed', error);
      alert(language === 'ar' ? 'حدث خطأ أثناء إتمام الطلب' : 'Error during checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 bg-creo-bg py-12 md:py-20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-creo-bg-sec rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-creo-muted" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">{t('cart_empty')}</h2>
          <p className="text-creo-text-sec mb-8">{t('cart_empty_desc')}</p>
          <Link to="/" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-creo-accent hover:bg-white text-black rounded-xl font-bold transition-colors w-full sm:w-auto">
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
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-creo-text-sec font-medium">{t('items_count').replace('{count}', totalItems.toString())}</span>
              <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> {t('clear_cart')}
              </button>
            </div>

            {cart.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-creo-card border border-creo-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 md:gap-6 relative">
                <div className="flex gap-4 flex-1">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-creo-bg shrink-0 border border-creo-border">
                    <img src={item.packageImage || item.gameImage} alt={item.gameName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{item.gameName}</h3>
                    <p className="text-sm text-creo-text-sec mt-1 line-clamp-1">{item.packageName}</p>
                    <p className="text-sm text-creo-accent font-medium mt-1">{item.packageAmount} {item.currency}</p>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-creo-border">
                  <span className="text-xl font-bold text-white">{formatPrice(item.totalPrice)}</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCartQuantity(item.gameId, item.packageId, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-creo-border flex items-center justify-center hover:border-creo-accent"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => setCartQuantity(item.gameId, item.packageId, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-creo-border flex items-center justify-center hover:border-creo-accent"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-creo-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" aria-label="Remove item">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="w-full lg:w-96 shrink-0">
            <div className="bg-creo-card border border-creo-border rounded-2xl p-6 sticky top-24 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-3">{language === 'ar' ? 'كود الخصم' : 'Discount Code'}</h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-creo-accent/10 border border-creo-accent/30 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-creo-accent" />
                      <span className="font-mono font-bold text-creo-accent">{appliedCoupon.code}</span>
                    </div>
                    <button onClick={() => setAppliedCoupon(null)} className="text-creo-muted hover:text-white">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          if (/^[A-Z0-9]*$/.test(val)) {
                            setCouponCode(val);
                            setCouponError(null);
                          }
                        }}
                        placeholder={language === 'ar' ? 'أدخل الكود' : 'Enter code'}
                        className={cn('flex-1 bg-creo-bg border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-creo-accent/50 transition-all font-mono uppercase', couponError ? 'border-red-500/50' : 'border-creo-border')}
                      />
                      <button onClick={handleApplyCoupon} disabled={!couponCode || isValidatingCoupon} className="bg-creo-bg-sec hover:bg-creo-border text-white px-4 rounded-xl font-medium text-sm transition-colors disabled:opacity-50">
                        {isValidatingCoupon ? '...' : language === 'ar' ? 'تطبيق' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <div className="flex items-center gap-1.5 text-red-400 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        {couponError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-3">{t('payment_method')}</h3>
                <div className="space-y-2">
                  {['Credit Card', 'PayPal', 'Crypto'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedPayment(method)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-sm',
                        selectedPayment === method ? 'bg-creo-accent/10 border-creo-accent' : 'bg-creo-bg border-creo-border hover:border-creo-muted hover:bg-creo-bg-sec',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className={cn('w-4 h-4', selectedPayment === method ? 'text-creo-accent' : 'text-creo-muted')} />
                        <span className={cn('font-medium', selectedPayment === method ? 'text-white' : 'text-creo-text-sec')}>{method}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 pb-4 border-b border-creo-border">{t('order_summary')}</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-creo-text-sec text-sm">
                    <span>{t('subtotal')}</span>
                    <span className="text-white">{formatPrice(subtotal)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-creo-accent text-sm">
                      <span>{language === 'ar' ? 'خصم' : 'Discount'} ({appliedCoupon.code})</span>
                      <span>- {formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-creo-text-sec text-sm">
                    <span>{t('processing_fee')}</span>
                    <span className="text-white">{formatPrice(0)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-creo-border mb-6">
                  <div className="flex justify-between items-end">
                    <span className="text-creo-text-sec font-medium">{t('total')}</span>
                    <span className="text-3xl font-bold text-creo-accent">{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="mb-4 text-xs text-creo-text-sec text-center">
                  {t('agree_terms')}
                  <Link to="/terms" className="text-creo-accent hover:underline">{t('terms')}</Link>
                  {t('and')}
                  <Link to="/privacy" className="text-creo-accent hover:underline">{t('privacy')}</Link>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className={cn('w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2', isCheckingOut ? 'bg-creo-accent/50 text-black cursor-wait' : 'bg-creo-accent hover:bg-white text-black')}
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      <span>{t('processing')}</span>
                    </>
                  ) : (
                    <>
                      {t('checkout')} <ArrowRight className={cn('w-5 h-5', language === 'ar' && 'rotate-180')} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
