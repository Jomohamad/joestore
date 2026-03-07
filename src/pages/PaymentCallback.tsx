import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { verifyPaymentCallbackApi } from '../services/api';
import { useStore } from '../context/StoreContext';

type ViewState = 'processing' | 'success' | 'error';

export default function PaymentCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useStore();
  const [state, setState] = useState<ViewState>('processing');
  const [message, setMessage] = useState('');

  const normalizedProvider = useMemo(() => {
    const value = String(provider || '').trim().toLowerCase();
    return value === 'fawaterk' ? ('fawaterk' as const) : null;
  }, [provider]);

  useEffect(() => {
    if (!normalizedProvider) {
      setState('error');
      setMessage(language === 'ar' ? 'مزود دفع غير صالح' : 'Invalid payment provider');
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const [key, value] of searchParams.entries()) {
      payload[key] = value;
    }

    const verify = async () => {
      try {
        await verifyPaymentCallbackApi(normalizedProvider, payload);
        setState('success');
        setMessage(
          language === 'ar'
            ? 'تم تأكيد الدفع بنجاح. سيتم تحويلك إلى الطلبات.'
            : 'Payment verified successfully. Redirecting to orders.',
        );
        setTimeout(() => navigate('/orders'), 1200);
      } catch (error) {
        setState('error');
        setMessage(error instanceof Error ? error.message : language === 'ar' ? 'فشل تأكيد الدفع' : 'Payment verification failed');
      }
    };

    void verify();
  }, [language, navigate, normalizedProvider, searchParams]);

  return (
    <div className="flex-1 bg-creo-bg py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-creo-border bg-creo-card p-6 text-center">
        {state === 'processing' && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-creo-accent animate-spin mx-auto" />
            <h1 className="text-xl font-bold text-white">
              {language === 'ar' ? 'جاري التحقق من الدفع' : 'Verifying payment'}
            </h1>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h1 className="text-xl font-bold text-white">{language === 'ar' ? 'تم الدفع بنجاح' : 'Payment successful'}</h1>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-white">{language === 'ar' ? 'فشل الدفع' : 'Payment failed'}</h1>
            <div className="flex gap-3 justify-center">
              <Link to="/cart" className="px-4 py-2 rounded-lg bg-creo-accent text-black font-semibold">
                {language === 'ar' ? 'الرجوع للسلة' : 'Back to cart'}
              </Link>
              <Link to="/orders" className="px-4 py-2 rounded-lg border border-creo-border text-white font-semibold">
                {language === 'ar' ? 'الطلبات' : 'Orders'}
              </Link>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-creo-text-sec mt-4">{message}</p>}
      </div>
    </div>
  );
}
