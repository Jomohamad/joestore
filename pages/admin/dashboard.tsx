import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { dayKey, formatCurrency, formatDateTime } from '../../src/admin/helpers';
import { AdminCard, Panel, StatusPill } from '../../src/admin/ui';
import { DashboardWidgetsSkeleton } from '../../src/components/skeletons';
import {
  fetchAdminApiMonitor,
  fetchAdminFraudAlerts,
  fetchAdminOrders,
  fetchAdminTransactions,
  fetchAdminUsers,
} from '../../src/services/api';

const RECENT_LIMIT = 8;

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [fraudAlerts, setFraudAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [apiMonitor, setApiMonitor] = useState<Record<string, unknown>>({ providers: [] });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ordersRes, usersRes, txRes, fraudRes, monitorRes] = await Promise.all([
          fetchAdminOrders(''),
          fetchAdminUsers(''),
          fetchAdminTransactions(),
          fetchAdminFraudAlerts(),
          fetchAdminApiMonitor(),
        ]);
        if (!mounted) return;
        setOrders((ordersRes || []) as unknown as Array<Record<string, unknown>>);
        setUsers((usersRes || []) as Array<Record<string, unknown>>);
        setTransactions((txRes || []) as Array<Record<string, unknown>>);
        setFraudAlerts((fraudRes || []) as Array<Record<string, unknown>>);
        setApiMonitor(monitorRes || { providers: [] });
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      const key = dayKey(order.created_at);
      if (!key) continue;
      map.set(key, Number((map.get(key) || 0) + Number(order.price || 0)));
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-7)
      .map(([key, value]) => ({ key, value }));
  }, [orders]);

  const topGames = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      const game = String(order.game || order.game_id || 'Unknown');
      map.set(game, Number((map.get(game) || 0) + Number(order.quantity || 1)));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([game, count]) => ({ game, count }));
  }, [orders]);

  const providers = useMemo(() => {
    const rows = Array.isArray(apiMonitor.providers) ? (apiMonitor.providers as Array<Record<string, unknown>>) : [];
    return rows.slice(0, 6);
  }, [apiMonitor]);

  const todayStats = useMemo(() => {
    const today = dayKey(new Date().toISOString());
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalTopups = 0;

    for (const order of orders) {
      if (dayKey(order.created_at) === today) {
        totalOrders += 1;
        totalRevenue += Number(order.price || 0);
      }
      if (String(order.status || '').toLowerCase() === 'completed') {
        totalTopups += 1;
      }
    }

    return {
      totalOrders,
      totalRevenue,
      totalUsers: users.length,
      totalTopups,
    };
  }, [orders, users.length]);

  const maxRevenue = Math.max(...revenueByDay.map((item) => item.value), 1);
  const maxGameCount = Math.max(...topGames.map((item) => item.count), 1);

  return (
    <AdminPage title="Dashboard">
      {loading ? (
        <DashboardWidgetsSkeleton />
      ) : (
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminCard title="Total Orders Today" value={todayStats.totalOrders} />
          <AdminCard title="Total Revenue Today" value={formatCurrency(todayStats.totalRevenue, 'EGP')} />
          <AdminCard title="Total Users" value={todayStats.totalUsers} />
          <AdminCard title="Total Top-ups" value={todayStats.totalTopups} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Daily Revenue" subtitle="Last 7 days">
            <div className="space-y-3">
              {revenueByDay.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex justify-between text-xs text-slate-300">
                    <span>{item.key}</span>
                    <span>{formatCurrency(item.value, 'EGP')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max((item.value / maxRevenue) * 100, 3)}%` }} />
                  </div>
                </div>
              ))}
              {!revenueByDay.length ? <p className="text-sm text-slate-400">No data yet.</p> : null}
            </div>
          </Panel>

          <Panel title="Top Selling Games" subtitle="By order volume">
            <div className="space-y-3">
              {topGames.map((item) => (
                <div key={item.game}>
                  <div className="mb-1 flex justify-between text-xs text-slate-300">
                    <span className="truncate pr-3">{item.game}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-fuchsia-400" style={{ width: `${Math.max((item.count / maxGameCount) * 100, 3)}%` }} />
                  </div>
                </div>
              ))}
              {!topGames.length ? <p className="text-sm text-slate-400">No data yet.</p> : null}
            </div>
          </Panel>

          <Panel title="Provider Performance" subtitle="Success/error rates">
            <div className="space-y-3">
              {providers.map((provider) => {
                const name = String(provider.provider || 'unknown');
                const successRate = Number(provider.successRate || 0);
                const errorRate = Number(provider.errorRate || 0);
                return (
                  <div key={name} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-sm font-medium text-white">{name}</p>
                    <p className="mt-1 text-xs text-slate-400">Success {successRate.toFixed(2)}% | Error {errorRate.toFixed(2)}%</p>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(successRate, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
              {!providers.length ? <p className="text-sm text-slate-400">No provider metrics yet.</p> : null}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Recent Orders" subtitle="Latest operations">
            <div className="space-y-3">
              {orders.slice(0, RECENT_LIMIT).map((order) => (
                <div key={String(order.id)} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">#{String(order.id).slice(0, 8)}</p>
                    <StatusPill status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatCurrency(order.price, String(order.currency || 'EGP'))}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                </div>
              ))}
              {!orders.length ? <p className="text-sm text-slate-400">No orders yet.</p> : null}
            </div>
          </Panel>

          <Panel title="Failed Transactions" subtitle="Needs manual review">
            <div className="space-y-3">
              {transactions
                .filter((tx) => String(tx.status || '').toLowerCase().includes('fail'))
                .slice(0, RECENT_LIMIT)
                .map((tx, idx) => (
                  <div key={`${String(tx.id || idx)}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{String(tx.provider || 'provider')}</p>
                      <StatusPill status={tx.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Order: {String(tx.order_id || '-')}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(tx.created_at)}</p>
                  </div>
                ))}
              {!transactions.some((tx) => String(tx.status || '').toLowerCase().includes('fail')) ? (
                <p className="text-sm text-slate-400">No failed transactions.</p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Fraud Alerts" subtitle="Latest suspicious activity">
            <div className="space-y-3">
              {fraudAlerts.slice(0, RECENT_LIMIT).map((alert, idx) => (
                <div key={`${String(alert.id || idx)}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="text-sm font-medium text-white">Risk {Number(alert.risk_score || 0)}</p>
                  <p className="mt-1 text-xs text-slate-400">{String(alert.reason || 'Suspicious activity')}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(alert.created_at)}</p>
                </div>
              ))}
              {!fraudAlerts.length ? <p className="text-sm text-slate-400">No fraud alerts.</p> : null}
            </div>
          </Panel>
        </div>

      </div>
      )}
    </AdminPage>
  );
}
