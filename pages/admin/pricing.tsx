import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatCurrency } from '../../src/admin/helpers';
import { Panel, PrimaryButton, TextInput } from '../../src/admin/ui';
import {
  fetchAdminPricingRules,
  fetchAdminProducts,
  fetchAdminProviderPrices,
  fetchAdminSettings,
  updateAdminSetting,
  upsertAdminPricingRule,
} from '../../src/services/api';

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [providerPrices, setProviderPrices] = useState<Array<Record<string, unknown>>>([]);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [marginDraft, setMarginDraft] = useState<Record<string, string>>({});
  const [minProfitDraft, setMinProfitDraft] = useState<Record<string, string>>({});
  const [globalMargin, setGlobalMargin] = useState('0');

  const load = async () => {
    const [productsRes, pricesRes, rulesRes, settingsRes] = await Promise.all([
      fetchAdminProducts(),
      fetchAdminProviderPrices(),
      fetchAdminPricingRules(),
      fetchAdminSettings(),
    ]);

    setProducts((productsRes || []) as Array<Record<string, unknown>>);
    setProviderPrices((pricesRes || []) as Array<Record<string, unknown>>);
    setRules((rulesRes || []) as Array<Record<string, unknown>>);

    const pricingSetting = (settingsRes || []).find((item) => String(item.key || '') === 'pricing_global');
    if (pricingSetting) {
      const val = pricingSetting.value as Record<string, unknown> | undefined;
      if (val && val.defaultMarginPercent !== undefined) {
        setGlobalMargin(String(val.defaultMarginPercent));
      }
    }
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
        setError(err instanceof Error ? err.message : 'Failed to load pricing data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const ruleMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const rule of rules) {
      map.set(String(rule.product_id || ''), rule);
    }
    return map;
  }, [rules]);

  const cheapestProviderPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of providerPrices) {
      const productId = String(row.product_id || '');
      const price = Number(row.price || 0);
      if (!productId || !Number.isFinite(price) || price <= 0) continue;
      const current = map.get(productId);
      if (!current || price < current) map.set(productId, price);
    }
    return map;
  }, [providerPrices]);

  const rows = useMemo(() => {
    return products.map((product) => {
      const productId = String(product.id || '');
      const rule = ruleMap.get(productId);
      const basePrice = cheapestProviderPriceMap.get(productId) || Number(product.price || 0);
      const marginPercent = Number(rule?.margin_percent ?? 0);
      const minProfit = Number(rule?.min_profit ?? 0);
      const calculated = Number((basePrice * (1 + marginPercent / 100)).toFixed(2));
      const finalPrice = Math.max(calculated, basePrice + minProfit);
      return {
        product,
        rule,
        basePrice,
        marginPercent,
        minProfit,
        finalPrice,
      };
    });
  }, [products, ruleMap, cheapestProviderPriceMap]);

  const saveRule = async (productId: string) => {
    try {
      setSaving(productId);
      setError(null);
      const row = rows.find((item) => String(item.product.id || '') === productId);
      const marginPercent = Number(marginDraft[productId] ?? row?.marginPercent ?? 0);
      const minProfit = Number(minProfitDraft[productId] ?? row?.minProfit ?? 0);
      await upsertAdminPricingRule({
        productId,
        marginPercent,
        minProfit,
        maxProfit: 0,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing rule');
    } finally {
      setSaving(null);
    }
  };

  const saveGlobalMargin = async () => {
    try {
      setSaving('global');
      setError(null);
      await updateAdminSetting({
        key: 'pricing_global',
        value: {
          defaultMarginPercent: Number(globalMargin || 0),
        },
        description: 'Global pricing defaults',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update global margin');
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminPage title="Pricing System">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Global Margin Rule"
          subtitle="Applied as default when product-specific rule is missing"
          actions={<PrimaryButton onClick={() => void saveGlobalMargin()} disabled={saving === 'global'}>Save Global Rule</PrimaryButton>}
        >
          <div className="flex max-w-sm items-center gap-3">
            <label className="text-sm text-slate-300">Default margin %</label>
            <TextInput type="number" step="0.01" value={globalMargin} onChange={(e) => setGlobalMargin(e.target.value)} />
          </div>
        </Panel>

        <Panel title="Per Product Pricing Rules" subtitle="Set margin and minimum profit per product">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Product</th>
                  <th className="px-2 py-3">Provider</th>
                  <th className="px-2 py-3">Provider Price</th>
                  <th className="px-2 py-3">Margin %</th>
                  <th className="px-2 py-3">Min Profit</th>
                  <th className="px-2 py-3">Final Price</th>
                  <th className="px-2 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const productId = String(row.product.id || '');
                  return (
                    <tr key={productId} className="border-b border-slate-900">
                      <td className="px-2 py-3 text-slate-100">{String(row.product.name || row.product.title || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{String(row.product.provider || '-')}</td>
                      <td className="px-2 py-3 text-slate-300">{formatCurrency(row.basePrice, String(row.product.currency || 'EGP'))}</td>
                      <td className="px-2 py-3">
                        <TextInput
                          type="number"
                          className="w-28"
                          value={marginDraft[productId] ?? String(row.marginPercent)}
                          onChange={(e) => setMarginDraft((prev) => ({ ...prev, [productId]: e.target.value }))}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <TextInput
                          type="number"
                          className="w-28"
                          value={minProfitDraft[productId] ?? String(row.minProfit)}
                          onChange={(e) => setMinProfitDraft((prev) => ({ ...prev, [productId]: e.target.value }))}
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-300">{formatCurrency(row.finalPrice, String(row.product.currency || 'EGP'))}</td>
                      <td className="px-2 py-3">
                        <PrimaryButton onClick={() => void saveRule(productId)} disabled={saving === productId}>
                          Save Rule
                        </PrimaryButton>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={7}>
                      {loading ? 'Loading pricing rules...' : 'No products available.'}
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
