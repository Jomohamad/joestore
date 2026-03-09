import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from '../lib/supabase';
import { useStore } from '../context/StoreContext';
import { loginWithBackendApi } from '../services/api';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [searchParams] = useSearchParams();
  const { t, language } = useStore();

  const oauthError = useMemo(() => {
    const code = searchParams.get('error');
    if (code === 'account_not_found') return t('account_not_found');
    if (code === 'account_exists') return t('account_exists');
    if (code === 'complete_profile_required') return t('complete_profile_required');
    return null;
  }, [searchParams, t]);

  const handleSocialLogin = async (provider: 'google' | 'discord') => {
    try {
      setError(null);
      if (!isSupabaseConfigured) {
        setError(supabaseConfigErrorMessage);
        return;
      }
      localStorage.setItem('auth_intent', 'login');
      const { error: oauthErrorResponse } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (oauthErrorResponse) throw oauthErrorResponse;
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError(language === 'ar' ? 'البريد الإلكتروني وكلمة المرور مطلوبان' : 'Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const session = await loginWithBackendApi({
        email: email.trim(),
        password,
      });
      if (!isSupabaseConfigured) {
        throw new Error(supabaseConfigErrorMessage);
      }
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (setSessionError) throw setSessionError;
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError(language === 'ar' ? 'اكتب البريد الإلكتروني أولًا لإرسال رابط الاستعادة' : 'Enter your email first to send a reset link');
      return;
    }

    setResetting(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(supabaseConfigErrorMessage);
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      setInfo(language === 'ar' ? 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني' : 'Password reset email has been sent');
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'تعذر إرسال رابط الاستعادة' : 'Failed to send reset email'));
    } finally {
      setResetting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError(language === 'ar' ? 'اكتب البريد الإلكتروني أولًا' : 'Enter your email first');
      return;
    }

    setResendingConfirmation(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(supabaseConfigErrorMessage);
      }
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (resendError) throw resendError;

      setInfo(
        language === 'ar'
          ? 'تمت إعادة إرسال رسالة التفعيل. راجع البريد الوارد وSpam.'
          : 'Confirmation email resent. Check Inbox and Spam.',
      );
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'تعذر إعادة إرسال رسالة التفعيل' : 'Failed to resend confirmation email'));
    } finally {
      setResendingConfirmation(false);
    }
  };

  return (
    <div className="flex-1 bg-creo-bg flex items-center justify-center py-10 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-creo-border bg-creo-card shadow-2xl"
      >
        <div className="p-7 border-b border-creo-border">
          <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-display font-bold text-white mb-2">{t('login')}</h1>
          <p className="text-sm text-creo-text-sec">{language === 'ar' ? 'سجّل دخولك إلى حسابك' : 'Sign in to your account'}</p>
        </div>

        <div className="p-7 space-y-4">
          {(oauthError || error) && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm text-center">
              {oauthError || error}
            </div>
          )}

          {String(oauthError || error || '').toLowerCase().includes('email not confirmed') && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendingConfirmation}
              className="w-full rounded-lg border border-creo-border bg-creo-bg-sec hover:border-creo-accent text-sm font-medium text-white py-2.5 transition-colors disabled:opacity-60"
            >
              {resendingConfirmation
                ? language === 'ar'
                  ? 'جاري إعادة الإرسال...'
                  : 'Resending...'
                : language === 'ar'
                  ? 'إعادة إرسال إيميل التفعيل'
                  : 'Resend confirmation email'}
            </button>
          )}

          {info && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg text-sm text-center">
              {info}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              className="w-full rounded-lg bg-creo-bg-sec border border-creo-border px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-creo-accent"
              autoComplete="email"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'ar' ? 'كلمة المرور' : 'Password'}
                className="w-full rounded-lg bg-creo-bg-sec border border-creo-border px-4 py-3 pr-11 text-white focus:outline-none focus:ring-1 focus:ring-creo-accent"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-creo-muted hover:text-white"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="w-full text-right text-xs text-creo-text-sec hover:text-creo-accent transition-colors disabled:opacity-60"
            >
              {resetting
                ? language === 'ar'
                  ? 'جاري الإرسال...'
                  : 'Sending...'
                : language === 'ar'
                  ? 'نسيت كلمة المرور؟'
                  : 'Forgot password?'}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 rounded-lg bg-creo-accent hover:bg-white text-black font-bold py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...'}
                </span>
              ) : (
                t('login')
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-sm text-creo-text-sec">
            <span className="me-1">{t('dont_have_account')}</span>
            <Link to="/signup" className="text-creo-accent hover:underline font-semibold">
              {t('signup')}
            </Link>
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-creo-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-creo-card px-3 text-creo-text-sec">{language === 'ar' ? 'أو' : 'Or'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSocialLogin('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-creo-border rounded-lg bg-creo-bg hover:bg-creo-bg-sec text-sm font-medium text-creo-text transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t('login_with_google')}
            </button>

            <button
              onClick={() => handleSocialLogin('discord')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-creo-border rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-sm font-medium text-white transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-.59 1.227 18.355 18.355 0 0 0-5.527 0 13.482 13.482 0 0 0-.59-1.227.074.074 0 0 0-.079-.037A19.736 19.736 0 0 0 3.674 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              {t('login_with_discord')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
