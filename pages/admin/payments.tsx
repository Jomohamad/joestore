import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatCurrency, formatDateTime, safeJson } from '../../src/admin/helpers';
import { JsonModal, Panel, PrimaryButton, SecondaryButton, StatusPill, TextInput } from '../../src/admin/ui';
import { fetchAdminPayments, refundAdminPayment, verifyAdminPayment } from '../../src/services/api';

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [jsonModal, setJsonModal] = useState<string | null>(null);

  const load = async () => {
    const rows = await fetchAdminPayments();
    setPayments((rows || []) as Array<Record<string, unknown>>);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        await load();
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((payment) => {
      const haystack = [payment.id, payment.order_id, payment.transaction_id, payment.gateway, payment.status]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [payments, search]);

  const runAction = async (paymentId: string, action: 'verify' | 'refund') => {
    try {
      setBusyId(paymentId + action);
      setError(null);
      if (action === 'verify') await verifyAdminPayment(paymentId);
      if (action === 'refund') await refundAdminPayment(paymentId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} payment`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage title="Payments Management">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Fawaterk Payments"
          subtitle="Manage invoices, verification and refunds"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payment, order, tx id" />
              <PrimaryButton onClick={() => void load()}>Refresh</PrimaryButton>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Payment ID</th>
                  <th className="px-2 py-3">Order ID</th>
                  <th className="px-2 py-3">Gateway</th>
                  <th className="px-2 py-3">Transaction</th>
                  <th className="px-2 py-3">Amount</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => {
                  const id = String(payment.id || '');
                  const isBusy = Boolean(busyId && busyId.startsWith(id));
                  return (
                    <tr key={id} className="border-b border-slate-900">
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{id}</td>
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{String(payment.order_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(payment.gateway || 'fawaterk')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(payment.transaction_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{formatCurrency(payment.amount, 'EGP')}</td>
                      <td className="px-2 py-3">
                        <StatusPill status={payment.status} />
                      </td>
                      <td className="px-2 py-3 text-slate-400">{formatDateTime(payment.created_at)}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton onClick={() => void runAction(id, 'verify')} disabled={isBusy}>
                            Verify
                          </SecondaryButton>
                          <SecondaryButton onClick={() => void runAction(id, 'refund')} disabled={isBusy}>
                            Refund
                          </SecondaryButton>
                          <SecondaryButton onClick={() => setJsonModal(safeJson(payment.raw_response || payment))}>View</SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={8}>
                      {loading ? 'Loading payments...' : 'No payments found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <JsonModal open={Boolean(jsonModal)} title="Payment Response" body={jsonModal || ''} onClose={() => setJsonModal(null)} />
    </AdminPage>
  );
}
