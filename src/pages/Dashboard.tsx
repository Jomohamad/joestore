import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  deleteAdminProduct,
  fetchAdminGames,
  fetchAdminLogs,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminProducts,
  fetchAdminTransactions,
  fetchAdminUsers,
  retryAdminOrder,
  setAdminOrderStatus,
  updateAdminUserRole,
  upsertAdminGame,
  upsertAdminProduct,
} from '../services/api';
import { DashboardWidgetsSkeleton } from '../components/skeletons';

interface AdminGame {
  id: string;
  name: string;
  provider_api?: 'reloadly' | 'gamesdrop' | string;
  active?: boolean;
}

interface AdminProduct {
  id: string;
  game_id: string;
  name: string;
  provider_product_id: string;
  price: number;
  currency: string;
  active?: boolean;
}

interface AdminOrder {
  id: string;
  user_id?: string;
  status: string;
  player_id?: string;
  package?: string;
  price?: number;
  provider?: string;
  created_at?: string;
}

interface AdminUser {
  id: string;
  email?: string;
  username?: string;
  role?: 'admin' | 'user' | string;
  created_at?: string;
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  const [isLoadingPanel, setIsLoadingPanel] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [orderSearch, setOrderSearch] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, string>>({});
  const [savingOrderStatusId, setSavingOrderStatusId] = useState<string | null>(null);

  const [gameName, setGameName] = useState('');
  const [gameProvider, setGameProvider] = useState<'reloadly' | 'gamesdrop'>('reloadly');
  const [gameActive, setGameActive] = useState(true);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productGameId, setProductGameId] = useState('');
  const [productName, setProductName] = useState('');
  const [providerProductId, setProviderProductId] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCurrency, setProductCurrency] = useState('EGP');
  const [productActive, setProductActive] = useState(true);

  const [userSearch, setUserSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const isAdmin = Boolean(profile?.is_admin);

  const refreshAll = async (search = orderSearch) => {
    setError(null);
    const [ordersData, gamesData, productsData, paymentsData, logsData, transactionsData, usersData] = await Promise.all([
      fetchAdminOrders(search),
      fetchAdminGames(),
      fetchAdminProducts(),
      fetchAdminPayments(),
      fetchAdminLogs(),
      fetchAdminTransactions(),
      fetchAdminUsers(userSearch),
    ]);

    setOrders(ordersData as AdminOrder[]);
    setGames(gamesData as AdminGame[]);
    setProducts(productsData as unknown as AdminProduct[]);
    setPayments(paymentsData);
    setLogs(logsData);
    setTransactions(transactionsData);
    setUsers(usersData as unknown as AdminUser[]);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user || !isAdmin) {
        if (active) setIsLoadingPanel(false);
        return;
      }

      try {
        setIsLoadingPanel(true);
        await refreshAll('');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load admin panel');
      } finally {
        if (active) setIsLoadingPanel(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [user?.id, isAdmin]);

  const ordersSummary = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length;
    const processing = orders.filter((o) => o.status === 'processing').length;
    const failed = orders.filter((o) => o.status === 'failed').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    return { pending, processing, failed, completed };
  }, [orders]);

  const onSearch = async () => {
    try {
      setError(null);
      const rows = await fetchAdminOrders(orderSearch);
      setOrders(rows as AdminOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search orders');
    }
  };

  const onRetry = async (orderId: string) => {
    try {
      setRetryingId(orderId);
      await retryAdminOrder(orderId);
      const rows = await fetchAdminOrders(orderSearch);
      setOrders(rows as AdminOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry order');
    } finally {
      setRetryingId(null);
    }
  };

  const onCreateGame = async () => {
    if (!gameName.trim()) return;
    try {
      await upsertAdminGame({
        name: gameName.trim(),
        provider_api: gameProvider,
        active: gameActive,
      });
      setGameName('');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game');
    }
  };

  const onCreateProduct = async () => {
    if (!productGameId || !productName.trim() || !providerProductId.trim() || !productPrice.trim()) return;
    try {
      await upsertAdminProduct({
        id: editingProductId || undefined,
        game_id: productGameId,
        name: productName.trim(),
        provider_product_id: providerProductId.trim(),
        price: Number(productPrice),
        currency: productCurrency.trim().toUpperCase() || 'EGP',
        active: productActive,
      });
      setEditingProductId(null);
      setProductGameId('');
      setProductName('');
      setProviderProductId('');
      setProductPrice('');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    }
  };

  const onEditProduct = (product: AdminProduct) => {
    setEditingProductId(product.id);
    setProductGameId(product.game_id);
    setProductName(product.name);
    setProviderProductId(product.provider_product_id);
    setProductPrice(String(product.price));
    setProductCurrency(product.currency);
    setProductActive(product.active !== false);
  };

  const onDeleteProduct = async (productId: string) => {
    try {
      await deleteAdminProduct(productId);
      if (editingProductId === productId) {
        setEditingProductId(null);
      }
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const onSaveOrderStatus = async (orderId: string) => {
    const status = String(orderStatusDrafts[orderId] || '').trim().toLowerCase();
    if (!status) return;
    try {
      setSavingOrderStatusId(orderId);
      await setAdminOrderStatus(orderId, status as 'pending' | 'paid' | 'processing' | 'completed' | 'failed');
      const rows = await fetchAdminOrders(orderSearch);
      setOrders(rows as AdminOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setSavingOrderStatusId(null);
    }
  };

  const onUserSearch = async () => {
    try {
      const rows = await fetchAdminUsers(userSearch);
      setUsers(rows as unknown as AdminUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    }
  };

  const onChangeUserRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      setUpdatingUserId(userId);
      await updateAdminUserRole(userId, role);
      const rows = await fetchAdminUsers(userSearch);
      setUsers(rows as unknown as AdminUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading || isLoadingPanel) {
    return (
      <div className="flex-1 bg-creo-bg py-12 md:py-16">
        <div className="container mx-auto px-4">
          <DashboardWidgetsSkeleton />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 space-y-6">
        <div className="max-w-5xl bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8">
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-3">Dashboard</h1>
          <p className="text-creo-text-sec">Admin panel is active. Manage orders, games, products, payments and logs from here.</p>
        </div>

        {error && (
          <div className="max-w-5xl rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
          <div className="rounded-xl border border-creo-border bg-creo-card p-4">
            <p className="text-creo-text-sec text-sm">Pending</p>
            <p className="text-white text-2xl font-bold">{ordersSummary.pending}</p>
          </div>
          <div className="rounded-xl border border-creo-border bg-creo-card p-4">
            <p className="text-creo-text-sec text-sm">Processing</p>
            <p className="text-white text-2xl font-bold">{ordersSummary.processing}</p>
          </div>
          <div className="rounded-xl border border-creo-border bg-creo-card p-4">
            <p className="text-creo-text-sec text-sm">Failed</p>
            <p className="text-white text-2xl font-bold">{ordersSummary.failed}</p>
          </div>
          <div className="rounded-xl border border-creo-border bg-creo-card p-4">
            <p className="text-creo-text-sec text-sm">Completed</p>
            <p className="text-white text-2xl font-bold">{ordersSummary.completed}</p>
          </div>
        </div>

        <div className="max-w-5xl rounded-2xl border border-creo-border bg-creo-card p-5 space-y-4">
          <h2 className="text-xl font-bold text-white">Orders</h2>
          <div className="flex gap-2">
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search by order, player, user, status"
              className="flex-1 bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
            />
            <button onClick={onSearch} className="px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">Search</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-creo-text-sec border-b border-creo-border">
                  <th className="text-left py-2">Order</th>
                  <th className="text-left py-2">Player ID</th>
                  <th className="text-left py-2">Price</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Provider</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-creo-border/60 text-white">
                    <td className="py-2 pr-3">{order.id}</td>
                    <td className="py-2 pr-3">{order.player_id || '-'}</td>
                    <td className="py-2 pr-3">{typeof order.price === 'number' ? order.price.toFixed(2) : '-'}</td>
                    <td className="py-2 pr-3 uppercase">{order.status}</td>
                    <td className="py-2 pr-3">{order.provider || '-'}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {order.status === 'failed' && (
                          <button
                            onClick={() => onRetry(order.id)}
                            disabled={retryingId === order.id}
                            className="px-3 py-1.5 rounded-md border border-creo-border bg-creo-bg-sec hover:border-creo-accent"
                          >
                            {retryingId === order.id ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                        <select
                          value={orderStatusDrafts[order.id] ?? order.status}
                          onChange={(e) => setOrderStatusDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="bg-creo-bg-sec border border-creo-border rounded-md px-2 py-1 text-white"
                        >
                          <option value="pending">pending</option>
                          <option value="paid">paid</option>
                          <option value="processing">processing</option>
                          <option value="completed">completed</option>
                          <option value="failed">failed</option>
                        </select>
                        <button
                          onClick={() => onSaveOrderStatus(order.id)}
                          disabled={savingOrderStatusId === order.id}
                          className="px-3 py-1.5 rounded-md border border-creo-border bg-creo-bg-sec hover:border-creo-accent"
                        >
                          {savingOrderStatusId === order.id ? 'Saving...' : 'Set'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
          <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
            <h2 className="text-xl font-bold text-white">Manage Games</h2>
            <div className="space-y-2">
              <input
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Game name"
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
              />
              <div className="flex gap-2">
                <select
                  value={gameProvider}
                  onChange={(e) => setGameProvider(e.target.value as 'reloadly' | 'gamesdrop')}
                  className="flex-1 bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                >
                  <option value="reloadly">reloadly</option>
                  <option value="gamesdrop">gamesdrop</option>
                </select>
                <label className="flex items-center gap-2 text-creo-text-sec text-sm px-2">
                  <input type="checkbox" checked={gameActive} onChange={(e) => setGameActive(e.target.checked)} />
                  Active
                </label>
              </div>
              <button onClick={onCreateGame} className="w-full px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">Save Game</button>
            </div>

            <div className="max-h-48 overflow-auto border border-creo-border rounded-lg">
              {games.map((game) => (
                <div key={game.id} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                  <span className="text-white font-medium">{game.name}</span>
                  <span className="text-creo-text-sec ml-2">{String(game.provider_api || '')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
            <h2 className="text-xl font-bold text-white">Manage Products</h2>
            <div className="space-y-2">
              <select
                value={productGameId}
                onChange={(e) => setProductGameId(e.target.value)}
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
              >
                <option value="">Select game</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white" />
              <input value={providerProductId} onChange={(e) => setProviderProductId(e.target.value)} placeholder="Provider product ID" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Price" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white" />
                <input value={productCurrency} onChange={(e) => setProductCurrency(e.target.value)} placeholder="Currency" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white" />
              </div>
              <label className="flex items-center gap-2 text-creo-text-sec text-sm px-2">
                <input type="checkbox" checked={productActive} onChange={(e) => setProductActive(e.target.checked)} />
                Active
              </label>
              <button onClick={onCreateProduct} className="w-full px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">
                {editingProductId ? 'Update Product' : 'Save Product'}
              </button>
            </div>

            <div className="max-h-48 overflow-auto border border-creo-border rounded-lg">
              {products.map((product) => (
                <div key={product.id} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-medium">{product.name}</span>
                      <span className="text-creo-text-sec ml-2">{product.price} {product.currency}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEditProduct(product)} className="px-2 py-1 rounded border border-creo-border text-creo-text-sec hover:border-creo-accent">
                        Edit
                      </button>
                      <button onClick={() => onDeleteProduct(product.id)} className="px-2 py-1 rounded border border-red-500/50 text-red-300 hover:border-red-400">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
          <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
            <h2 className="text-xl font-bold text-white">Payments</h2>
            <div className="max-h-56 overflow-auto border border-creo-border rounded-lg">
              {payments.map((payment) => (
                <div key={String(payment.id)} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                  <div className="text-white">{String(payment.id)}</div>
                  <div className="text-creo-text-sec">{String(payment.status || '')} - {String(payment.amount || '')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
            <h2 className="text-xl font-bold text-white">Logs</h2>
            <div className="max-h-56 overflow-auto border border-creo-border rounded-lg">
              {logs.map((log) => (
                <div key={String(log.id)} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                  <div className="text-white">{String(log.type || '')}</div>
                  <div className="text-creo-text-sec">{String(log.message || '')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
          <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
            <h2 className="text-xl font-bold text-white">Transactions</h2>
            <div className="max-h-56 overflow-auto border border-creo-border rounded-lg">
              {transactions.map((tx) => (
                <div key={String(tx.id)} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                  <div className="text-white">{String(tx.provider || '')} - {String(tx.status || '')}</div>
                  <div className="text-creo-text-sec">{String(tx.order_id || '')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
            <h2 className="text-xl font-bold text-white">Users</h2>
            <div className="flex gap-2">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email or username"
                className="flex-1 bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
              />
              <button onClick={onUserSearch} className="px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">Search</button>
            </div>
            <div className="max-h-56 overflow-auto border border-creo-border rounded-lg">
              {users.map((u) => (
                <div key={u.id} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-white">{u.email || u.id}</div>
                      <div className="text-creo-text-sec">{u.username || '-'} ({u.role || 'user'})</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onChangeUserRole(u.id, 'admin')}
                        disabled={updatingUserId === u.id}
                        className="px-2 py-1 rounded border border-creo-border text-creo-text-sec hover:border-creo-accent"
                      >
                        Make Admin
                      </button>
                      <button
                        onClick={() => onChangeUserRole(u.id, 'user')}
                        disabled={updatingUserId === u.id}
                        className="px-2 py-1 rounded border border-creo-border text-creo-text-sec hover:border-creo-accent"
                      >
                        Make User
                      </button>
                    </div>
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
