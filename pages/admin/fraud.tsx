import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatDateTime } from '../../src/admin/helpers';
import { Panel, PrimaryButton, SecondaryButton, TextInput } from '../../src/admin/ui';
import { fetchAdminFailedOrders, fetchAdminFraudAlerts, runAdminFraudAction } from '../../src/services/api';

export default function AdminFraudPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [failedOrders, setFailedOrders] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [fraudRes, failedRes] = await Promise.all([fetchAdminFraudAlerts(), fetchAdminFailedOrders()]);
    setAlerts((fraudRes || []) as Array<Record<string, unknown>>);
    setFailedOrders((failedRes || []) as Array<Record<string, unknown>>);
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
        setError(err instanceof Error ? err.message : 'Failed to load fraud data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((alert) => {
      const haystack = [alert.user_id, alert.ip_address, alert.country, alert.reason, alert.risk_score]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [alerts, search]);

  const runAction = async (
    payload: {
      action: 'block_user' | 'flag_order' | 'reduce_risk';
      userId?: string;
      orderId?: string;
      riskDelta?: number;
    },
    key: string,
  ) => {
    try {
      setBusy(key);
      setError(null);
      await runAdminFraudAction(payload);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fraud action failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminPage title="Fraud Detection">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Fraud Alerts"
          subtitle="Investigate suspicious activity and take actions"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, IP, reason" />
              <PrimaryButton onClick={() => void load()}>Refresh</PrimaryButton>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">User ID</th>
                  <th className="px-2 py-3">IP</th>
                  <th className="px-2 py-3">Country</th>
                  <th className="px-2 py-3">Risk Score</th>
                  <th className="px-2 py-3">Reason</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert, idx) => {
                  const key = String(alert.id || idx);
                  const userId = String(alert.user_id || '');
                  return (
                    <tr key={key} className="border-b border-slate-900">
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{userId || '-'}</td>
                      <td className="px-2 py-3 text-slate-300">{String(alert.ip_address || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(alert.country || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{Number(alert.risk_score || 0)}</td>
                      <td className="px-2 py-3 text-slate-300">{String(alert.reason || '-')}</td>
                      <td className="px-2 py-3 text-slate-400">{formatDateTime(alert.created_at)}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton
                            disabled={!userId || busy === `${key}:block`}
                            onClick={() => void runAction({ action: 'block_user', userId }, `${key}:block`)}
                          >
                            Block User
                          </SecondaryButton>
                          <SecondaryButton
                            disabled={!userId || busy === `${key}:risk`}
                            onClick={() => void runAction({ action: 'reduce_risk', userId, riskDelta: -10 }, `${key}:risk`)}
                          >
                            Reduce Risk
                          </SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredAlerts.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={7}>
                      {loading ? 'Loading fraud alerts...' : 'No fraud alerts found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Failed Orders" subtitle="Flag suspicious failed orders quickly">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Order ID</th>
                  <th className="px-2 py-3">User</th>
                  <th className="px-2 py-3">Provider</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {failedOrders.slice(0, 200).map((order) => {
                  const orderId = String(order.id || '');
                  return (
                    <tr key={orderId} className="border-b border-slate-900">
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{orderId}</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.user_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.provider || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.status || '-')}</td>
                      <td className="px-2 py-3 text-slate-400">{formatDateTime(order.updated_at || order.created_at)}</td>
                      <td className="px-2 py-3">
                        <PrimaryButton
                          disabled={busy === `${orderId}:flag`}
                          onClick={() => void runAction({ action: 'flag_order', orderId }, `${orderId}:flag`)}
                        >
                          Flag Order
                        </PrimaryButton>
                      </td>
                    </tr>
                  );
                })}
                {!failedOrders.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={6}>
                      No failed orders.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AdminPage>
  );
}
