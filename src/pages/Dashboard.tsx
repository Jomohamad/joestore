import { useEffect, useMemo, useState } from 'react';
import { Navigate } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import {
  deleteAdminProduct,
  fetchAdminFraudAlerts,
  fetchAdminDiscountRules,
  fetchAdminGames,
  fetchAdminLogs,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminPricingRules,
  fetchAdminProducts,
  fetchAdminProviderHealth,
  fetchAdminProviderPrices,
  fetchAdminTransactions,
  fetchAdminUsers,
  fetchAdminMetrics,
  fetchAdminAlerts,
  fetchAdminProviderSla,
  retryAdminOrder,
  runAdminFraudAction,
  sendAdminTestAlert,
  setAdminOrderStatus,
  updateAdminProviderHealth,
  upsertAdminProviderSla,
  updateAdminUserRole,
  createAdminDiscountRule,
  upsertAdminGame,
  upsertAdminPricingRule,
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
  provider?: string;
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
  is_blocked?: boolean;
  fraud_risk_score?: number;
}

type DashboardTab = 'overview' | 'orders' | 'products' | 'users' | 'providers' | 'pricing' | 'discounts' | 'fraud' | 'transactions' | 'metrics';

const dashboardTabs: Array<{ key: DashboardTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'users', label: 'Users' },
  { key: 'providers', label: 'Providers' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'discounts', label: 'Discounts' },
  { key: 'fraud', label: 'Fraud' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'metrics', label: 'Metrics' },
];

const asRecord = (value: unknown) => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  const [isLoadingPanel, setIsLoadingPanel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [providerHealth, setProviderHealth] = useState<Array<Record<string, unknown>>>([]);
  const [providerPrices, setProviderPrices] = useState<Array<Record<string, unknown>>>([]);
  const [fraudAlerts, setFraudAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [pricingRules, setPricingRules] = useState<Array<Record<string, unknown>>>([]);
  const [discountRules, setDiscountRules] = useState<Array<Record<string, unknown>>>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [providerSla, setProviderSla] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);

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

  const [providerDrafts, setProviderDrafts] = useState<Record<string, { enabled: boolean; priority: number }>>({});
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);

  const [pricingProductId, setPricingProductId] = useState('');
  const [pricingMargin, setPricingMargin] = useState('20');
  const [pricingMinProfit, setPricingMinProfit] = useState('0');
  const [pricingMaxProfit, setPricingMaxProfit] = useState('0');
  const [savingPricing, setSavingPricing] = useState(false);
  const [discountScope, setDiscountScope] = useState('global');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [discountFixed, setDiscountFixed] = useState('0');
  const [discountGameId, setDiscountGameId] = useState('');
  const [discountCategory, setDiscountCategory] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [slaDrafts, setSlaDrafts] = useState<Record<string, { success: string; latency: string; enabled: boolean }>>({});
  const [savingSla, setSavingSla] = useState(false);

  const [runningFraudAction, setRunningFraudAction] = useState<string | null>(null);

  const isAdmin = Boolean(profile?.is_admin || String((user?.user_metadata as Record<string, unknown> | undefined)?.role || '').toLowerCase() === 'admin');

  const refreshAll = async (search = orderSearch, usersSearch = userSearch) => {
    setError(null);
    const [ordersData, gamesData, productsData, paymentsData, logsData, transactionsData, usersData, providerHealthData, providerPricesData, fraudAlertsData, pricingRulesData, discountRulesData, metricsData, slaData, alertsData] =
      await Promise.all([
        fetchAdminOrders(search),
        fetchAdminGames(),
        fetchAdminProducts(),
        fetchAdminPayments(),
        fetchAdminLogs(),
        fetchAdminTransactions(),
        fetchAdminUsers(usersSearch),
        fetchAdminProviderHealth(),
        fetchAdminProviderPrices(),
        fetchAdminFraudAlerts(),
        fetchAdminPricingRules(),
        fetchAdminDiscountRules(),
        fetchAdminMetrics(),
        fetchAdminProviderSla(),
        fetchAdminAlerts(),
      ]);

    setOrders(ordersData as AdminOrder[]);
    setGames(gamesData as AdminGame[]);
    setProducts(productsData as unknown as AdminProduct[]);
    setPayments(paymentsData);
    setLogs(logsData);
    setTransactions(transactionsData);
    setUsers(usersData as unknown as AdminUser[]);
    setProviderHealth(providerHealthData);
    setProviderPrices(providerPricesData);
    setFraudAlerts(fraudAlertsData);
    setPricingRules(pricingRulesData);
    setDiscountRules(discountRulesData);
    setMetrics(metricsData);
    setProviderSla(slaData);
    setAlerts(alertsData);
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
        await refreshAll('', '');
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

  useEffect(() => {
    const next: Record<string, { enabled: boolean; priority: number }> = {};
    for (const row of providerHealth) {
      const provider = String(row.provider || '').toLowerCase();
      if (!provider) continue;
      next[provider] = {
        enabled: row.enabled !== false,
        priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : 100,
      };
    }
    setProviderDrafts(next);
  }, [providerHealth]);

  useEffect(() => {
    const next: Record<string, { success: string; latency: string; enabled: boolean }> = {};
    for (const row of providerSla) {
      const provider = String(row.provider || '').toLowerCase();
      if (!provider) continue;
      next[provider] = {
        success: String(row.target_success_rate || '95'),
        latency: String(row.target_latency_ms || '1500'),
        enabled: row.enabled !== false,
      };
    }
    setSlaDrafts(next);
  }, [providerSla]);

  const ordersSummary = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length;
    const processing = orders.filter((o) => o.status === 'processing').length;
    const failed = orders.filter((o) => o.status === 'failed').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    return { pending, processing, failed, completed };
  }, [orders]);

  const onSearchOrders = async () => {
    try {
      setError(null);
      const rows = await fetchAdminOrders(orderSearch);
      setOrders(rows as AdminOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search orders');
    }
  };

  const onRetryOrder = async (orderId: string) => {
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

  const onTrackEvent = async (eventType: string) => {
    try {
      await import('../services/api').then(({ trackAnalyticsEvent }) => trackAnalyticsEvent(eventType, { source: 'admin' }));
    } catch {
      // ignore
    }
  };
  const onCreateDiscountRule = async () => {
    try {
      setSavingDiscount(true);
      const payload = {
        scope: discountScope,
        percent: Number(discountPercent || 0),
        fixed_amount: Number(discountFixed || 0),
        game_id: discountGameId || null,
        category: discountCategory || null,
        active: true,
      };
      await createAdminDiscountRule(payload);
      const rules = await fetchAdminDiscountRules();
      setDiscountRules(rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create discount rule');
    } finally {
      setSavingDiscount(false);
    }
  };

  const onSaveSla = async () => {
    try {
      setSavingSla(true);
      const updates = Object.entries(slaDrafts);
      for (const [provider, draft] of updates) {
        await upsertAdminProviderSla({
          provider,
          target_success_rate: Number(draft.success || '95'),
          target_latency_ms: Number(draft.latency || '1500'),
          enabled: draft.enabled !== false,
        });
      }
      const rows = await fetchAdminProviderSla();
      setProviderSla(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update SLA');
    } finally {
      setSavingSla(false);
    }
  };

  const onSendTestAlert = async () => {
    try {
      await sendAdminTestAlert();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test alert');
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

  const onSaveProduct = async () => {
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
      if (editingProductId === productId) setEditingProductId(null);
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

  const onSaveProvider = async (provider: string) => {
    const draft = providerDrafts[provider];
    if (!draft) return;
    try {
      setSavingProviderId(provider);
      await updateAdminProviderHealth({
        provider,
        enabled: draft.enabled,
        priority: draft.priority,
      });
      const rows = await fetchAdminProviderHealth();
      setProviderHealth(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update provider');
    } finally {
      setSavingProviderId(null);
    }
  };

  const onSavePricingRule = async () => {
    if (!pricingProductId) return;
    try {
      setSavingPricing(true);
      await upsertAdminPricingRule({
        productId: pricingProductId,
        marginPercent: Number(pricingMargin || 0),
        minProfit: Number(pricingMinProfit || 0),
        maxProfit: Number(pricingMaxProfit || 0),
      });
      const rows = await fetchAdminPricingRules();
      setPricingRules(rows);
      setPricingProductId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing rule');
    } finally {
      setSavingPricing(false);
    }
  };

  const onFraudAction = async (id: string, payload: { action: 'block_user' | 'flag_order' | 'reduce_risk'; userId?: string; orderId?: string; riskDelta?: number }) => {
    try {
      setRunningFraudAction(id);
      await runAdminFraudAction(payload);
      await refreshAll(orderSearch, userSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fraud action failed');
    } finally {
      setRunningFraudAction(null);
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
        <div className="max-w-6xl bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8">
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-3">Dashboard</h1>
          <p className="text-creo-text-sec">Admin panel is active. Manage orders, products, users, providers, pricing and fraud from here.</p>
        </div>

        {error ? <div className="max-w-6xl rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 px-4 py-3">{error}</div> : null}

        <div className="max-w-6xl overflow-x-auto">
          <div className="inline-flex min-w-full md:min-w-0 gap-2 rounded-xl border border-creo-border bg-creo-card p-2">
            {dashboardTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-11 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-creo-accent text-black'
                    : 'bg-creo-bg-sec border border-creo-border text-creo-text-sec hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {(activeTab === 'overview' || activeTab === 'orders') && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-6xl">
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

            <div className="max-w-6xl rounded-2xl border border-creo-border bg-creo-card p-5 space-y-4">
              <h2 className="text-xl font-bold text-white">Orders Management</h2>
              <div className="flex gap-2">
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by order, player, user, status"
                  className="flex-1 bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                />
                <button onClick={onSearchOrders} className="px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">
                  Search
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
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
                            {order.status === 'failed' ? (
                              <button
                                onClick={() => onRetryOrder(order.id)}
                                disabled={retryingId === order.id}
                                className="px-3 py-1.5 rounded-md border border-creo-border bg-creo-bg-sec hover:border-creo-accent"
                              >
                                {retryingId === order.id ? 'Retrying...' : 'Retry'}
                              </button>
                            ) : null}
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
          </>
        )}

        {(activeTab === 'overview' || activeTab === 'products') && (
          <div className="grid xl:grid-cols-2 gap-6 max-w-6xl">
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
                <button onClick={onCreateGame} className="w-full px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">
                  Save Game
                </button>
              </div>

              <div className="max-h-56 overflow-auto border border-creo-border rounded-lg">
                {games.map((game) => (
                  <div key={game.id} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                    <span className="text-white font-medium">{game.name}</span>
                    <span className="text-creo-text-sec ml-2">{String(game.provider_api || '')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
              <h2 className="text-xl font-bold text-white">Products Management</h2>
              <div className="space-y-2">
                <select
                  value={productGameId}
                  onChange={(e) => setProductGameId(e.target.value)}
                  className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                >
                  <option value="">Select game</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
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
                <button onClick={onSaveProduct} className="w-full px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">
                  {editingProductId ? 'Update Product' : 'Save Product'}
                </button>
              </div>

              <div className="max-h-56 overflow-auto border border-creo-border rounded-lg">
                {products.map((product) => (
                  <div key={product.id} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-white font-medium">{product.name}</span>
                        <span className="text-creo-text-sec ml-2">
                          {product.price} {product.currency}
                        </span>
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
        )}

        {(activeTab === 'overview' || activeTab === 'users') && (
          <div className="max-w-6xl rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
            <h2 className="text-xl font-bold text-white">Users Management</h2>
            <div className="flex gap-2">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email or username"
                className="flex-1 bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
              />
              <button onClick={onUserSearch} className="px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">
                Search
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-creo-text-sec border-b border-creo-border">
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Blocked</th>
                    <th className="text-left py-2">Risk Score</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-creo-border/60 text-sm text-white">
                      <td className="py-2 pr-3">
                        <div>{u.email || u.id}</div>
                        <div className="text-creo-text-sec">{u.username || '-'}</div>
                      </td>
                      <td className="py-2 pr-3">{u.role || 'user'}</td>
                      <td className="py-2 pr-3">{u.is_blocked ? 'yes' : 'no'}</td>
                      <td className="py-2 pr-3">{Number(u.fraud_risk_score || 0).toFixed(0)}</td>
                      <td className="py-2 pr-3">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'providers') && (
          <div className="grid xl:grid-cols-2 gap-6 max-w-6xl">
            <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
              <h2 className="text-xl font-bold text-white">Providers Management</h2>
              <div className="space-y-2 max-h-80 overflow-auto">
                {providerHealth.map((row) => {
                  const provider = String(row.provider || '').toLowerCase();
                  const draft = providerDrafts[provider] || { enabled: row.enabled !== false, priority: 100 };
                  return (
                    <div key={provider} className="rounded-lg border border-creo-border bg-creo-bg-sec p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">{provider || 'provider'}</p>
                          <p className="text-xs text-creo-text-sec">
                            success: {Number(row.success_count || 0)} | failed: {Number(row.failure_count || 0)} | {Number(row.last_response_ms || 0)}ms
                          </p>
                        </div>
                        <button
                          onClick={() => onSaveProvider(provider)}
                          disabled={savingProviderId === provider}
                          className="px-3 py-1.5 rounded-md border border-creo-border bg-creo-bg-sec hover:border-creo-accent text-white"
                        >
                          {savingProviderId === provider ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-sm text-creo-text-sec">
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(e) =>
                              setProviderDrafts((prev) => ({
                                ...prev,
                                [provider]: { ...draft, enabled: e.target.checked },
                              }))
                            }
                          />
                          Enabled
                        </label>
                        <input
                          type="number"
                          value={draft.priority}
                          onChange={(e) =>
                            setProviderDrafts((prev) => ({
                              ...prev,
                              [provider]: { ...draft, priority: Number(e.target.value || 0) },
                            }))
                          }
                          className="bg-creo-bg border border-creo-border rounded px-2 py-1 text-white"
                          placeholder="Priority"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
              <h2 className="text-xl font-bold text-white">Provider Prices</h2>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-creo-text-sec border-b border-creo-border">
                      <th className="text-left py-2">Provider</th>
                      <th className="text-left py-2">Product</th>
                      <th className="text-left py-2">Price</th>
                      <th className="text-left py-2">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerPrices.map((row) => (
                      <tr key={String(row.id)} className="border-b border-creo-border/60 text-white">
                        <td className="py-2 pr-3">{String(row.provider || '-')}</td>
                        <td className="py-2 pr-3">{String(row.product_id || '-')}</td>
                        <td className="py-2 pr-3">
                          {String(row.price || '-')} {String(row.currency || '')}
                        </td>
                        <td className="py-2 pr-3">{String(row.updated_at || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'pricing') && (
          <div className="max-w-6xl rounded-2xl border border-creo-border bg-creo-card p-5 space-y-4">
            <h2 className="text-xl font-bold text-white">Pricing System</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-2">
              <select value={pricingProductId} onChange={(e) => setPricingProductId(e.target.value)} className="xl:col-span-2 bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white">
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input value={pricingMargin} onChange={(e) => setPricingMargin(e.target.value)} placeholder="Margin %" className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white" />
              <input value={pricingMinProfit} onChange={(e) => setPricingMinProfit(e.target.value)} placeholder="Min Profit" className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white" />
              <input value={pricingMaxProfit} onChange={(e) => setPricingMaxProfit(e.target.value)} placeholder="Max Profit" className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white" />
            </div>
            <button onClick={onSavePricingRule} disabled={savingPricing} className="px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">
              {savingPricing ? 'Saving...' : 'Save Pricing Rule'}
            </button>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[740px]">
                <thead>
                  <tr className="text-creo-text-sec border-b border-creo-border">
                    <th className="text-left py-2">Product</th>
                    <th className="text-left py-2">Margin %</th>
                    <th className="text-left py-2">Min Profit</th>
                    <th className="text-left py-2">Max Profit</th>
                    <th className="text-left py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRules.map((row) => (
                    <tr key={String(row.id || row.product_id)} className="border-b border-creo-border/60 text-white">
                      <td className="py-2 pr-3">{String(row.product_id || '-')}</td>
                      <td className="py-2 pr-3">{String(row.margin_percent || '0')}</td>
                      <td className="py-2 pr-3">{String(row.min_profit || '0')}</td>
                      <td className="py-2 pr-3">{String(row.max_profit || '0')}</td>
                      <td className="py-2 pr-3">{String(row.updated_at || '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'discounts') && (
          <div className="max-w-6xl rounded-2xl border border-creo-border bg-creo-card p-5 space-y-4">
            <h2 className="text-xl font-bold text-white">Discount Rules</h2>
            <div className="grid md:grid-cols-5 gap-2">
              <input
                value={discountScope}
                onChange={(e) => setDiscountScope(e.target.value)}
                className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                placeholder="scope"
              />
              <input
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                placeholder="percent"
              />
              <input
                value={discountFixed}
                onChange={(e) => setDiscountFixed(e.target.value)}
                className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                placeholder="fixed"
              />
              <input
                value={discountGameId}
                onChange={(e) => setDiscountGameId(e.target.value)}
                className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                placeholder="game_id"
              />
              <input
                value={discountCategory}
                onChange={(e) => setDiscountCategory(e.target.value)}
                className="bg-creo-bg-sec border border-creo-border rounded-lg px-3 py-2.5 text-white"
                placeholder="category"
              />
            </div>
            <button onClick={onCreateDiscountRule} disabled={savingDiscount} className="px-4 py-2.5 rounded-lg bg-creo-accent text-black font-semibold">
              {savingDiscount ? 'Saving...' : 'Create Rule'}
            </button>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-creo-text-sec border-b border-creo-border">
                    <th className="text-left py-2">Scope</th>
                    <th className="text-left py-2">Percent</th>
                    <th className="text-left py-2">Fixed</th>
                    <th className="text-left py-2">Game</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {discountRules.map((row) => (
                    <tr key={String(row.id)} className="border-b border-creo-border/60 text-white">
                      <td className="py-2 pr-3">{String(row.scope || '-')}</td>
                      <td className="py-2 pr-3">{String(row.percent || '0')}</td>
                      <td className="py-2 pr-3">{String(row.fixed_amount || '0')}</td>
                      <td className="py-2 pr-3">{String(row.game_id || '-')}</td>
                      <td className="py-2 pr-3">{String(row.category || '-')}</td>
                      <td className="py-2 pr-3">{row.active === false ? 'false' : 'true'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'metrics') && (
          <div className="max-w-6xl grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-creo-border bg-creo-card p-5">
              <p className="text-sm text-creo-text-sec">Total Orders</p>
              <div className="text-2xl font-bold text-white">{String(metrics.orders || 0)}</div>
            </div>
            <div className="rounded-2xl border border-creo-border bg-creo-card p-5">
              <p className="text-sm text-creo-text-sec">Completed</p>
              <div className="text-2xl font-bold text-white">{String(metrics.completed || 0)}</div>
            </div>
            <div className="rounded-2xl border border-creo-border bg-creo-card p-5">
              <p className="text-sm text-creo-text-sec">Failed</p>
              <div className="text-2xl font-bold text-white">{String(metrics.failed || 0)}</div>
            </div>
            <div className="rounded-2xl border border-creo-border bg-creo-card p-5">
              <p className="text-sm text-creo-text-sec">Revenue</p>
              <div className="text-2xl font-bold text-white">{String(metrics.revenue || 0)}</div>
            </div>

            <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3 md:col-span-2">
              <h3 className="text-lg font-bold text-white">Provider SLA</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-creo-text-sec border-b border-creo-border">
                      <th className="text-left py-2">Provider</th>
                      <th className="text-left py-2">Target Success %</th>
                      <th className="text-left py-2">Target Latency</th>
                      <th className="text-left py-2">Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerSla.map((row) => {
                      const provider = String(row.provider || '');
                      const draft = slaDrafts[provider] || { success: '95', latency: '1500', enabled: true };
                      return (
                        <tr key={provider} className="border-b border-creo-border/60 text-white">
                          <td className="py-2 pr-3">{provider}</td>
                          <td className="py-2 pr-3">
                            <input
                              value={draft.success}
                              onChange={(e) => setSlaDrafts((prev) => ({ ...prev, [provider]: { ...draft, success: e.target.value } }))}
                              className="w-24 bg-creo-bg-sec border border-creo-border rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={draft.latency}
                              onChange={(e) => setSlaDrafts((prev) => ({ ...prev, [provider]: { ...draft, latency: e.target.value } }))}
                              className="w-28 bg-creo-bg-sec border border-creo-border rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="checkbox"
                              checked={draft.enabled}
                              onChange={(e) => setSlaDrafts((prev) => ({ ...prev, [provider]: { ...draft, enabled: e.target.checked } }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onSaveSla} disabled={savingSla} className="px-4 py-2 rounded-lg bg-creo-accent text-black font-semibold">
                  {savingSla ? 'Saving...' : 'Save SLA'}
                </button>
                <button onClick={onSendTestAlert} className="px-4 py-2 rounded-lg border border-creo-border text-creo-text-sec">
                  Send Test Alert
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3 md:col-span-2">
              <h3 className="text-lg font-bold text-white">Alerts Log</h3>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-creo-text-sec border-b border-creo-border">
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Message</th>
                      <th className="text-left py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((row) => (
                      <tr key={String(row.id)} className="border-b border-creo-border/60 text-white">
                        <td className="py-2 pr-3">{String(row.type || '')}</td>
                        <td className="py-2 pr-3">{String(row.message || '')}</td>
                        <td className="py-2 pr-3">{String(row.created_at || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a
                href="/api/admin/exports/orders"
                className="inline-flex px-4 py-2 rounded-lg border border-creo-border text-creo-text-sec hover:text-white"
              >
                Export Orders CSV
              </a>
            </div>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'fraud') && (
          <div className="max-w-6xl rounded-2xl border border-creo-border bg-creo-card p-5 space-y-4">
            <h2 className="text-xl font-bold text-white">Fraud Monitoring</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[920px]">
                <thead>
                  <tr className="text-creo-text-sec border-b border-creo-border">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">IP / Country</th>
                    <th className="text-left py-2">Risk</th>
                    <th className="text-left py-2">Reason</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudAlerts.map((row) => {
                    const metadata = asRecord(row.metadata);
                    const rowId = String(row.id || `${row.user_id || ''}-${row.created_at || ''}`);
                    const userId = String(row.user_id || metadata.userId || '').trim();
                    const orderId = String(row.order_id || metadata.orderId || '').trim();
                    const busy = runningFraudAction === rowId;

                    return (
                      <tr key={rowId} className="border-b border-creo-border/60 text-white">
                        <td className="py-2 pr-3">{String(row.created_at || '-')}</td>
                        <td className="py-2 pr-3">{userId || '-'}</td>
                        <td className="py-2 pr-3">
                          {String(row.ip_address || '-')}/{String(row.country || '-')}
                        </td>
                        <td className="py-2 pr-3">{String(row.risk_score || '-')}</td>
                        <td className="py-2 pr-3">{String(row.reason || '-')}</td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => onFraudAction(rowId, { action: 'block_user', userId })}
                              disabled={!userId || busy}
                              className="px-2 py-1 rounded border border-red-500/50 text-red-300 disabled:opacity-40"
                            >
                              {busy ? '...' : 'Block User'}
                            </button>
                            <button
                              onClick={() => onFraudAction(rowId, { action: 'flag_order', orderId })}
                              disabled={!orderId || busy}
                              className="px-2 py-1 rounded border border-creo-border text-creo-text-sec disabled:opacity-40"
                            >
                              Flag Order
                            </button>
                            <button
                              onClick={() => onFraudAction(rowId, { action: 'reduce_risk', userId, riskDelta: -10 })}
                              disabled={!userId || busy}
                              className="px-2 py-1 rounded border border-creo-border text-creo-text-sec disabled:opacity-40"
                            >
                              Reduce Risk
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'transactions') && (
          <div className="grid xl:grid-cols-3 gap-6 max-w-6xl">
            <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3 xl:col-span-2">
              <h2 className="text-xl font-bold text-white">Transactions</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="text-creo-text-sec border-b border-creo-border">
                      <th className="text-left py-2">Provider</th>
                      <th className="text-left py-2">Order</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={String(tx.id)} className="border-b border-creo-border/60 text-white">
                        <td className="py-2 pr-3">{String(tx.provider || '')}</td>
                        <td className="py-2 pr-3">{String(tx.order_id || '')}</td>
                        <td className="py-2 pr-3">{String(tx.status || '')}</td>
                        <td className="py-2 pr-3">{String(tx.created_at || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
                <h2 className="text-xl font-bold text-white">Payments</h2>
                <div className="max-h-64 overflow-auto border border-creo-border rounded-lg">
                  {payments.map((payment) => (
                    <div key={String(payment.id)} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                      <div className="text-white">{String(payment.id)}</div>
                      <div className="text-creo-text-sec">
                        {String(payment.status || '')} - {String(payment.amount || '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-creo-border bg-creo-card p-5 space-y-3">
                <h2 className="text-xl font-bold text-white">Logs</h2>
                <div className="max-h-64 overflow-auto border border-creo-border rounded-lg">
                  {logs.map((log) => (
                    <div key={String(log.id)} className="px-3 py-2 border-b border-creo-border/60 text-sm">
                      <div className="text-white">{String(log.type || '')}</div>
                      <div className="text-creo-text-sec">{String(log.message || '')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
