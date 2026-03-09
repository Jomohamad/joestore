import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatDateTime, safeJson } from '../../src/admin/helpers';
import { JsonModal, Panel, PrimaryButton, SecondaryButton, TextInput } from '../../src/admin/ui';
import { fetchAdminLogs } from '../../src/services/api';

export default function AdminLogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [jsonModal, setJsonModal] = useState<string | null>(null);

  const load = async () => {
    const data = await fetchAdminLogs();
    setLogs((data || []) as Array<Record<string, unknown>>);
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
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((entry) => {
      const haystack = [entry.type, entry.message, safeJson(entry.metadata)]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [logs, search]);

  return (
    <AdminPage title="System Logs">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Platform Logs"
          subtitle="Top-up requests, payment webhooks, API errors and security alerts"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs" />
              <PrimaryButton onClick={() => void load()}>Refresh</PrimaryButton>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Type</th>
                  <th className="px-2 py-3">Message</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => (
                  <tr key={String(entry.id || idx)} className="border-b border-slate-900">
                    <td className="px-2 py-3 text-slate-300">{String(entry.type || '-')}</td>
                    <td className="px-2 py-3 text-slate-100">{String(entry.message || '-')}</td>
                    <td className="px-2 py-3 text-slate-400">{formatDateTime(entry.created_at)}</td>
                    <td className="px-2 py-3">
                      <SecondaryButton onClick={() => setJsonModal(safeJson(entry.metadata || {}))}>View</SecondaryButton>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={4}>
                      {loading ? 'Loading logs...' : 'No logs found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <JsonModal open={Boolean(jsonModal)} title="Log Metadata" body={jsonModal || ''} onClose={() => setJsonModal(null)} />
    </AdminPage>
  );
}
