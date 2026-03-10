import { useEffect, useState } from 'react';
import { Wallet, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { claimReferralCode, createWalletTopup, fetchReferralCode, fetchWalletBalance, fetchWalletTransactions } from '../services/api';
import { Link } from '../lib/router';
import { cn } from '../lib/utils';

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('EGP');
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [wallet, txs, referral] = await Promise.all([
        fetchWalletBalance(),
        fetchWalletTransactions(),
        fetchReferralCode(),
      ]);
      setBalance(wallet.balance);
      setCurrency(wallet.currency);
      setTransactions(txs);
      setReferralCode(referral.code || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const onTopup = async () => {
    const value = Number(amount || 0);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount');
      return;
    }
    try {
      setTopupLoading(true);
      setError(null);
      const session = await createWalletTopup(value, currency);
      if (session.checkoutUrl) {
        window.location.assign(session.checkoutUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topup');
    } finally {
      setTopupLoading(false);
    }
  };

  const onClaim = async () => {
    if (!claimCode.trim()) return;
    try {
      setClaiming(true);
      await claimReferralCode(claimCode.trim());
      setClaimCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim referral');
    } finally {
      setClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 bg-creo-bg pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-creo-muted mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-white mb-2">Wallet</h2>
          <p className="text-creo-text-sec mb-6">Please login to access your wallet.</p>
          <Link
            to="/login"
            className="inline-block bg-creo-accent text-black px-8 py-3 rounded-xl font-bold hover:bg-white transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-creo-accent/10 rounded-xl flex items-center justify-center text-creo-accent">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[clamp(1.3rem,3.5vw,2rem)] font-display font-bold text-white">Wallet</h1>
              <p className="text-sm text-creo-text-sec">Manage your balance and topups</p>
            </div>
          </div>
          <button
            onClick={() => load()}
            className="px-3 py-2 rounded-lg border border-creo-border text-creo-text-sec hover:text-white hover:border-creo-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-[1.4fr,1fr] gap-4">
          <div className="bg-creo-card border border-creo-border rounded-2xl p-6 space-y-4">
            <p className="text-sm text-creo-text-sec">Available Balance</p>
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : `${balance.toFixed(2)} ${currency}`}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Topup amount"
                className="flex-1 bg-creo-bg border border-creo-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-creo-accent/50"
              />
              <button
                onClick={onTopup}
                disabled={topupLoading}
                className={cn(
                  'px-4 py-2 rounded-xl font-bold text-black bg-creo-accent hover:bg-white transition-colors',
                  topupLoading && 'opacity-60 cursor-wait',
                )}
              >
                {topupLoading ? '...' : 'Topup'}
              </button>
            </div>
            {error && <div className="text-sm text-red-400">{error}</div>}
          </div>

          <div className="bg-creo-card border border-creo-border rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-sm text-creo-text-sec mb-2">Your referral code</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={referralCode || '...'}
                  className="flex-1 bg-creo-bg border border-creo-border rounded-xl px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => referralCode && navigator.clipboard?.writeText(referralCode)}
                  className="px-3 py-2 rounded-xl border border-creo-border text-creo-text-sec hover:text-white"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-creo-text-sec mb-2">Claim referral code</p>
              <div className="flex items-center gap-2">
                <input
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 bg-creo-bg border border-creo-border rounded-xl px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={onClaim}
                  disabled={claiming}
                  className={cn('px-3 py-2 rounded-xl bg-creo-accent text-black font-bold', claiming && 'opacity-60')}
                >
                  {claiming ? '...' : 'Claim'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-creo-text-sec mb-3">
              <ArrowDownCircle className="w-4 h-4 text-creo-accent" />
              Recent Transactions
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {transactions.length === 0 && !loading && (
                <div className="text-sm text-creo-text-sec">No wallet activity yet.</div>
              )}
              {transactions.map((tx) => (
                <div key={String(tx.id)} className="flex items-center justify-between text-sm border-b border-creo-border/60 pb-2">
                  <div>
                    <div className="text-white">{String(tx.type || 'tx').toUpperCase()}</div>
                    <div className="text-xs text-creo-text-sec">{String(tx.created_at || '')}</div>
                  </div>
                  <div className={String(tx.type || '') === 'debit' ? 'text-red-400' : 'text-emerald-400'}>
                    {String(tx.amount || '')} {String(tx.currency || '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
