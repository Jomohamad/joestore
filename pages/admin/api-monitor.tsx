import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatDateTime } from '../../src/admin/helpers';
import { AdminCard, Panel, PrimaryButton, StatusPill } from '../../src/admin/ui';
import { fetchAdminApiMonitor } from '../../src/services/api';

export default function AdminApiMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);

  const load = async () => {
    const payload = await fetchAdminApiMonitor();
    setProviders(Array.isArray(payload.providers) ? (payload.providers as Array<Record<string, unknown>>) : []);
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
        setError(err instanceof Error ? err.message : 'Failed to load API monitor');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    let success = 0;
    let failed = 0;
    for (const row of providers) {
      success += Number(row.success || 0);
      failed += Number(row.failed || 0);
    }
    const total = success + failed;
    const successRate = total > 0 ? (success / total) * 100 : 0;
    return { success, failed, successRate };
  }, [providers]);

  return (
    <AdminPage title="API Monitoring">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminCard title="Success Requests" value={totals.success} />
          <AdminCard title="Failed Requests" value={totals.failed} />
          <AdminCard title="Overall Success Rate" value={`${totals.successRate.toFixed(2)}%`} />
        </div>

        <Panel
          title="Provider API Health"
          subtitle="Response time, success and error rates"
          actions={<PrimaryButton onClick={() => void load()}>Refresh Metrics</PrimaryButton>}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {providers.map((row) => {
              const provider = String(row.provider || 'unknown');
              const successRate = Number(row.successRate || 0);
              const errorRate = Number(row.errorRate || 0);
              const responseTime = Number(row.responseTimeMs || 0);
              const enabled = row.enabled !== false;
              return (
                <div key={provider} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-white">{provider}</h4>
                    <StatusPill status={enabled ? 'enabled' : 'disabled'} />
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <p>Success rate: {successRate.toFixed(2)}%</p>
                    <p>Error rate: {errorRate.toFixed(2)}%</p>
                    <p>Response time: {responseTime} ms</p>
                    <p>Priority: {Number(row.priority || 100)}</p>
                    <p>Last failure: {row.lastFailureAt ? formatDateTime(row.lastFailureAt) : '-'}</p>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(successRate, 2)}%` }} />
                  </div>
                </div>
              );
            })}
            {!providers.length ? <p className="text-sm text-slate-400">{loading ? 'Loading API metrics...' : 'No provider metrics available.'}</p> : null}
          </div>
        </Panel>
      </div>
    </AdminPage>
  );
}
