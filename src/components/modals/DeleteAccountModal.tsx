import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabase';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export default function DeleteAccountModal({ isOpen, onClose, username }: DeleteAccountModalProps) {
  const { session, signOut } = useAuth();
  const { t } = useStore();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setInput('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    const normalizedInput = input.trim().toLowerCase();
    const normalizedUsername = (username || '').trim().toLowerCase();
    if (!normalizedUsername || normalizedInput !== normalizedUsername) {
      setError(t('username_mismatch'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ username: input }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const serverError = payload?.error || 'Failed to delete account';

        // Fallback: self-delete via SQL RPC (works even when server admin key is unavailable).
        const { error: rpcError } = await (supabase as any).rpc('delete_my_account', {
          p_username: input,
        });

        if (rpcError) {
          throw new Error(rpcError.message || serverError);
        }
      }

      await signOut();
      window.location.assign('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-500/40 bg-creo-card p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-creo-muted hover:bg-creo-bg-sec hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-500/15 p-2.5 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('danger_zone')}</h3>
                <p className="text-xs text-creo-text-sec">{t('delete_account_warning')}</p>
              </div>
            </div>

            <p className="mb-3 text-sm text-creo-text-sec">
              {t('delete_account_confirm')}
              <span className="ml-1 font-bold text-white">{username || '-'}</span>
            </p>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('enter_username')}
              className="mb-3 w-full rounded-xl border border-creo-border bg-creo-bg-sec px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-creo-border bg-creo-bg-sec px-4 py-2.5 text-sm font-semibold text-white hover:bg-creo-bg"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || input.trim().toLowerCase() !== (username || '').trim().toLowerCase()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t('delete_permanently')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
