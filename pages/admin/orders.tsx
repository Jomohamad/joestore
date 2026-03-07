import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatCurrency, formatDateTime, safeJson } from '../../src/admin/helpers';
import {
  DangerButton,
  JsonModal,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatusPill,
  TextInput,
} from '../../src/admin/ui';
import {
  cancelAdminOrder,
  fetchAdminGames,
  fetchAdminOrders,
  fetchAdminProducts,
  refundAdminOrder,
  retryAdminOrder,
  setAdminOrderStatus,
} from '../../src/services/api';

const STATUS_OPTIONS = ['pending', 'paid', 'processing', 'completed', 'failed'];

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [games, setGames] = useState<Array<Record<string, unknown>>>([]);
  const [viewJson, setViewJson] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});

  const load = async (q = search) => {
    setError(null);
    const [ordersRes, productsRes, gamesRes] = await Promise.all([
      fetchAdminOrders(q),
      fetchAdminProducts(),
      fetchAdminGames(),
    ]);

    setOrders((ordersRes || []) as unknown as Array<Record<string, unknown>>);
    setProducts((productsRes || []) as Array<Record<string, unknown>>);
    setGames((gamesRes || []) as unknown as Array<Record<string, unknown>>);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        await load('');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const p of products) map.set(String(p.id), p);
    return map;
  }, [products]);

  const gameMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const g of games) map.set(String(g.id), g);
    return map;
  }, [games]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'all' && String(order.status || '').toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [orders, statusFilter]);

  const runAction = async (orderId: string, action: 'retry' | 'refund' | 'cancel') => {
    try {
      setBusyId(orderId + action);
      setError(null);
      if (action === 'retry') await retryAdminOrder(orderId);
      if (action === 'refund') await refundAdminOrder(orderId);
      if (action === 'cancel') await cancelAdminOrder(orderId);
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} order`);
    } finally {
      setBusyId(null);
    }
  };

  const saveStatus = async (orderId: string) => {
    const status = String(statusDrafts[orderId] || '').toLowerCase();
    if (!STATUS_OPTIONS.includes(status)) return;
    try {
      setBusyId(orderId + 'status');
      await setAdminOrderStatus(orderId, status as 'pending' | 'paid' | 'processing' | 'completed' | 'failed');
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage title="Orders Management">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Orders"
          subtitle="Search, inspect and operate top-up orders"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, user, player, status" />
              <PrimaryButton onClick={() => void load(search)} disabled={loading}>
                Search
              </PrimaryButton>
            </>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
            {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Order ID</th>
                  <th className="px-2 py-3">User</th>
                  <th className="px-2 py-3">Game</th>
                  <th className="px-2 py-3">Product</th>
                  <th className="px-2 py-3">Player ID</th>
                  <th className="px-2 py-3">Provider</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Payment</th>
                  <th className="px-2 py-3">Amount</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const id = String(order.id || '');
                  const product = productMap.get(String(order.product_id || ''));
                  const game = gameMap.get(String(order.game_id || product?.game_id || ''));
                  const isBusy = Boolean(busyId && busyId.startsWith(id));
                  return (
                    <tr key={id} className="border-b border-slate-900 align-top">
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{id.slice(0, 10)}...</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.user_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(game?.name || order.game || order.game_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(product?.name || order.package || order.product_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.player_id || order.account_identifier || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.provider || '-')}</td>
                      <td className="px-2 py-3">
                        <StatusPill status={order.status} />
                      </td>
                      <td className="px-2 py-3">
                        <StatusPill status={order.payment_status || order.status} />
                      </td>
                      <td className="px-2 py-3 text-slate-300">{formatCurrency(order.price, String(order.currency || 'EGP'))}</td>
                      <td className="px-2 py-3 text-slate-400">{formatDateTime(order.created_at)}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton onClick={() => setViewJson(safeJson(order))}>View</SecondaryButton>
                          <SecondaryButton onClick={() => void runAction(id, 'retry')} disabled={isBusy}>
                            Retry
                          </SecondaryButton>
                          <SecondaryButton onClick={() => void runAction(id, 'refund')} disabled={isBusy}>
                            Refund
                          </SecondaryButton>
                          <DangerButton onClick={() => void runAction(id, 'cancel')} disabled={isBusy}>
                            Cancel
                          </DangerButton>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <SelectInput
                            value={statusDrafts[id] || String(order.status || 'pending')}
                            onChange={(e) => setStatusDrafts((prev) => ({ ...prev, [id]: e.target.value }))}
                            className="min-w-[140px]"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </SelectInput>
                          <PrimaryButton onClick={() => void saveStatus(id)} disabled={isBusy}>
                            Save
                          </PrimaryButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={11}>
                      No orders found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <JsonModal open={Boolean(viewJson)} title="Order Details" body={viewJson || ''} onClose={() => setViewJson(null)} />
    </AdminPage>
  );
}
