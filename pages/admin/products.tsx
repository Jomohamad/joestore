import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatCurrency } from '../../src/admin/helpers';
import {
  DangerButton,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TextInput,
} from '../../src/admin/ui';
import {
  deleteAdminProduct,
  fetchAdminGames,
  fetchAdminProducts,
  upsertAdminPricingRule,
  upsertAdminProduct,
} from '../../src/services/api';

const PROVIDERS = ['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'];

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [games, setGames] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [gameId, setGameId] = useState('');
  const [name, setName] = useState('');
  const [providerProductId, setProviderProductId] = useState('');
  const [provider, setProvider] = useState('reloadly');
  const [price, setPrice] = useState('');
  const [margin, setMargin] = useState('0');
  const [active, setActive] = useState(true);

  const load = async () => {
    const [productsRes, gamesRes] = await Promise.all([fetchAdminProducts(), fetchAdminGames()]);
    setProducts((productsRes || []) as Array<Record<string, unknown>>);
    setGames((gamesRes || []) as unknown as Array<Record<string, unknown>>);
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
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const gameMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const game of games) map.set(String(game.id), game);
    return map;
  }, [games]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const haystack = [p.id, p.name, p.provider_product_id, p.provider, p.game_id].map((v) => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(q);
    });
  }, [products, search]);

  const resetForm = () => {
    setEditId(null);
    setGameId('');
    setName('');
    setProviderProductId('');
    setProvider('reloadly');
    setPrice('');
    setMargin('0');
    setActive(true);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (product: Record<string, unknown>) => {
    setEditId(String(product.id));
    setGameId(String(product.game_id || ''));
    setName(String(product.name || ''));
    setProviderProductId(String(product.provider_product_id || ''));
    setProvider(String(product.provider || 'reloadly'));
    setPrice(String(product.price || ''));
    setActive(product.active !== false);
    setMargin('0');
    setModalOpen(true);
  };

  const saveProduct = async () => {
    if (!gameId || !name.trim() || !providerProductId.trim() || Number(price) <= 0) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const saved = await upsertAdminProduct({
        id: editId || undefined,
        game_id: gameId,
        name: name.trim(),
        provider_product_id: providerProductId.trim(),
        provider: provider as 'reloadly' | 'gamesdrop' | 'unipin' | 'seagm' | 'driffle',
        price: Number(price),
        currency: 'EGP',
        active,
      });

      const marginValue = Number(margin || 0);
      if (Number.isFinite(marginValue) && String(saved.id || '').trim()) {
        await upsertAdminPricingRule({
          productId: String(saved.id),
          marginPercent: marginValue,
          minProfit: 0,
          maxProfit: 0,
        });
      }

      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);
      await deleteAdminProduct(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminPage title="Products Management">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Products"
          subtitle="Create, update and delete game products"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product" />
              <PrimaryButton onClick={openCreate}>Add Product</PrimaryButton>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Game</th>
                  <th className="px-2 py-3">Product Name</th>
                  <th className="px-2 py-3">Provider</th>
                  <th className="px-2 py-3">Provider Product ID</th>
                  <th className="px-2 py-3">Price</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const id = String(product.id || '');
                  const game = gameMap.get(String(product.game_id || ''));
                  return (
                    <tr key={id} className="border-b border-slate-900">
                      <td className="px-2 py-3 text-slate-300">{String(game?.name || product.game || product.game_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-100">{String(product.name || product.title || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(product.provider || '-')}</td>
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{String(product.provider_product_id || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{formatCurrency(product.price, String(product.currency || 'EGP'))}</td>
                      <td className="px-2 py-3 text-slate-300">{product.active === false ? 'Inactive' : 'Active'}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton onClick={() => openEdit(product)}>Edit</SecondaryButton>
                          <DangerButton onClick={() => void removeProduct(id)} disabled={deletingId === id}>
                            Delete
                          </DangerButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredProducts.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={7}>
                      {loading ? 'Loading...' : 'No products found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-white">{editId ? 'Edit Product' : 'Add Product'}</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs uppercase text-slate-400">Game</span>
                <SelectInput value={gameId} onChange={(e) => setGameId(e.target.value)}>
                  <option value="">Select game</option>
                  {games.map((game) => (
                    <option key={String(game.id)} value={String(game.id)}>
                      {String(game.name || game.id)}
                    </option>
                  ))}
                </SelectInput>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs uppercase text-slate-400">Product Name</span>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 720 Diamonds" />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase text-slate-400">Provider</span>
                <SelectInput value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {PROVIDERS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectInput>
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase text-slate-400">Provider Product ID</span>
                <TextInput value={providerProductId} onChange={(e) => setProviderProductId(e.target.value)} />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase text-slate-400">Price</span>
                <TextInput type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase text-slate-400">Profit Margin %</span>
                <TextInput type="number" min="0" step="0.01" value={margin} onChange={(e) => setMargin(e.target.value)} />
              </label>

              <label className="mt-2 flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Product active
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => void saveProduct()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
