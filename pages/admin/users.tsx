import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatCurrency, formatDateTime } from '../../src/admin/helpers';
import { Panel, PrimaryButton, SecondaryButton, SelectInput, TextInput } from '../../src/admin/ui';
import { blockAdminUser, fetchAdminOrders, fetchAdminUsers, updateAdminUserRole } from '../../src/services/api';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const load = async (q = search) => {
    const [usersRes, ordersRes] = await Promise.all([fetchAdminUsers(q), fetchAdminOrders('')]);
    setUsers((usersRes || []) as Array<Record<string, unknown>>);
    setOrders((ordersRes || []) as unknown as Array<Record<string, unknown>>);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        await load('');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const userStats = useMemo(() => {
    const map = new Map<string, { orders: number; spending: number }>();
    for (const order of orders) {
      const userId = String(order.user_id || '');
      if (!userId) continue;
      const current = map.get(userId) || { orders: 0, spending: 0 };
      current.orders += 1;
      current.spending += Number(order.price || 0);
      map.set(userId, current);
    }
    return map;
  }, [orders]);

  const selectedOrders = useMemo(() => {
    if (!activeUserId) return [];
    return orders.filter((order) => String(order.user_id || '') === activeUserId).slice(0, 30);
  }, [orders, activeUserId]);

  const refreshSearch = async () => {
    try {
      setError(null);
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    }
  };

  const updateRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      setError(null);
      await updateAdminUserRole(userId, role);
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const toggleBlock = async (userId: string, blocked: boolean) => {
    try {
      setError(null);
      await blockAdminUser({ userId, blocked });
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change user status');
    }
  };

  return (
    <AdminPage title="Users Management">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Users"
          subtitle="Search users, change roles and block suspicious accounts"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user by email/username/id" />
              <PrimaryButton onClick={() => void refreshSearch()}>Search</PrimaryButton>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">User</th>
                  <th className="px-2 py-3">Role</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Total Orders</th>
                  <th className="px-2 py-3">Total Spending</th>
                  <th className="px-2 py-3">Fraud Risk Score</th>
                  <th className="px-2 py-3">Created</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const id = String(user.id || '');
                  const stats = userStats.get(id) || { orders: 0, spending: 0 };
                  const isBlocked = user.is_blocked === true;
                  return (
                    <tr key={id} className="border-b border-slate-900">
                      <td className="px-2 py-3">
                        <p className="font-medium text-white">{String(user.username || user.email || id)}</p>
                        <p className="text-xs text-slate-400">{String(user.email || id)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <SelectInput value={String(user.role || 'user')} onChange={(e) => void updateRole(id, e.target.value as 'admin' | 'user')}>
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </SelectInput>
                      </td>
                      <td className="px-2 py-3 text-slate-300">{isBlocked ? 'Blocked' : 'Active'}</td>
                      <td className="px-2 py-3 text-slate-300">{stats.orders}</td>
                      <td className="px-2 py-3 text-slate-300">{formatCurrency(stats.spending, 'EGP')}</td>
                      <td className="px-2 py-3 text-slate-300">{Number(user.fraud_risk_score || 0).toFixed(2)}</td>
                      <td className="px-2 py-3 text-slate-400">{formatDateTime(user.created_at)}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton onClick={() => setActiveUserId(id)}>View Orders</SecondaryButton>
                          <SecondaryButton onClick={() => void toggleBlock(id, !isBlocked)}>
                            {isBlocked ? 'Unban User' : 'Ban User'}
                          </SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!users.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={8}>
                      {loading ? 'Loading users...' : 'No users found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {activeUserId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">User Orders</h3>
              <SecondaryButton onClick={() => setActiveUserId(null)}>Close</SecondaryButton>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-2 py-3">Order ID</th>
                    <th className="px-2 py-3">Game</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Amount</th>
                    <th className="px-2 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrders.map((order) => (
                    <tr key={String(order.id)} className="border-b border-slate-900">
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{String(order.id)}</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.game || order.game_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(order.status || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{formatCurrency(order.price, String(order.currency || 'EGP'))}</td>
                      <td className="px-2 py-3 text-slate-400">{formatDateTime(order.created_at)}</td>
                    </tr>
                  ))}
                  {!selectedOrders.length ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-slate-400" colSpan={5}>
                        No orders for this user.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
