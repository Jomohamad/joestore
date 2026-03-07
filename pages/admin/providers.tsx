import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatCurrency, formatDateTime } from '../../src/admin/helpers';
import {
  Panel,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatusPill,
  TextInput,
} from '../../src/admin/ui';
import {
  fetchAdminApiMonitor,
  fetchAdminProviderHealth,
  fetchAdminProviderPrices,
  updateAdminProviderHealth,
} from '../../src/services/api';

const DEFAULT_PROVIDERS = ['reloadly', 'gamesdrop', 'unipin', 'seagm', 'driffle'];

export default function AdminProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthRows, setHealthRows] = useState<Array<Record<string, unknown>>>([]);
  const [priceRows, setPriceRows] = useState<Array<Record<string, unknown>>>([]);
  const [monitorRows, setMonitorRows] = useState<Array<Record<string, unknown>>>([]);
  const [priorityDraft, setPriorityDraft] = useState<Record<string, string>>({});

  const load = async () => {
    const [health, prices, monitor] = await Promise.all([
      fetchAdminProviderHealth(),
      fetchAdminProviderPrices(),
      fetchAdminApiMonitor(),
    ]);

    setHealthRows((health || []) as Array<Record<string, unknown>>);
    setPriceRows((prices || []) as Array<Record<string, unknown>>);
    setMonitorRows(Array.isArray(monitor.providers) ? (monitor.providers as Array<Record<string, unknown>>) : []);
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
        setError(err instanceof Error ? err.message : 'Failed to load provider data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const providerRows = useMemo(() => {
    const merged = new Map<string, Record<string, unknown>>();

    for (const provider of DEFAULT_PROVIDERS) {
      merged.set(provider, {
        provider,
        enabled: true,
        priority: 100,
        successRate: 0,
        errorRate: 0,
        responseTimeMs: 0,
      });
    }

    for (const row of healthRows) {
      const provider = String(row.provider || '').toLowerCase();
      const current = merged.get(provider) || { provider };
      merged.set(provider, { ...current, ...row });
    }

    for (const row of monitorRows) {
      const provider = String(row.provider || '').toLowerCase();
      const current = merged.get(provider) || { provider };
      merged.set(provider, { ...current, ...row });
    }

    return Array.from(merged.values()).sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
  }, [healthRows, monitorRows]);

  const updateProvider = async (provider: string, enabled: boolean, priority: number) => {
    try {
      setSaving(provider);
      setError(null);
      await updateAdminProviderHealth({ provider, enabled, priority });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update provider');
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminPage title="Game Providers">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Provider Health & Priority"
          subtitle="Enable/disable providers and control failover priority"
          actions={<PrimaryButton onClick={() => void load()}>Refresh</PrimaryButton>}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Provider</th>
                  <th className="px-2 py-3">Enabled</th>
                  <th className="px-2 py-3">Priority</th>
                  <th className="px-2 py-3">Success Rate</th>
                  <th className="px-2 py-3">Error Rate</th>
                  <th className="px-2 py-3">Response Time</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providerRows.map((row) => {
                  const provider = String(row.provider || 'unknown');
                  const enabled = row.enabled !== false;
                  const priority = Number.isFinite(Number(row.priority)) ? Number(row.priority) : 100;
                  return (
                    <tr key={provider} className="border-b border-slate-900">
                      <td className="px-2 py-3 text-slate-100">{provider}</td>
                      <td className="px-2 py-3">
                        <StatusPill status={enabled ? 'enabled' : 'disabled'} />
                      </td>
                      <td className="px-2 py-3">
                        <TextInput
                          type="number"
                          className="w-24"
                          value={priorityDraft[provider] ?? String(priority)}
                          onChange={(e) => setPriorityDraft((prev) => ({ ...prev, [provider]: e.target.value }))}
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-300">{Number(row.successRate || 0).toFixed(2)}%</td>
                      <td className="px-2 py-3 text-slate-300">{Number(row.errorRate || 0).toFixed(2)}%</td>
                      <td className="px-2 py-3 text-slate-300">{Number(row.responseTimeMs || 0)} ms</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton
                            disabled={saving === provider}
                            onClick={() =>
                              void updateProvider(
                                provider,
                                !enabled,
                                Number(priorityDraft[provider] ?? priority ?? 100),
                              )
                            }
                          >
                            {enabled ? 'Disable' : 'Enable'}
                          </SecondaryButton>
                          <PrimaryButton
                            disabled={saving === provider}
                            onClick={() =>
                              void updateProvider(
                                provider,
                                enabled,
                                Number(priorityDraft[provider] ?? priority ?? 100),
                              )
                            }
                          >
                            Save Priority
                          </PrimaryButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!providerRows.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={7}>
                      {loading ? 'Loading providers...' : 'No provider rows found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Provider Prices" subtitle="Latest provider pricing snapshots">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Provider</th>
                  <th className="px-2 py-3">Product ID</th>
                  <th className="px-2 py-3">Price</th>
                  <th className="px-2 py-3">Currency</th>
                  <th className="px-2 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {priceRows.slice(0, 200).map((row, idx) => (
                  <tr key={String(row.id || idx)} className="border-b border-slate-900">
                    <td className="px-2 py-3 text-slate-300">{String(row.provider || '-')}</td>
                    <td className="px-2 py-3 font-mono text-xs text-slate-300">{String(row.product_id || '-')}</td>
                    <td className="px-2 py-3 text-slate-300">{formatCurrency(row.price, String(row.currency || 'EGP'))}</td>
                    <td className="px-2 py-3 text-slate-300">{String(row.currency || 'EGP')}</td>
                    <td className="px-2 py-3 text-slate-400">{formatDateTime(row.updated_at)}</td>
                  </tr>
                ))}
                {!priceRows.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={5}>
                      No cached provider prices yet.
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
