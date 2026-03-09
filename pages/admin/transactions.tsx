import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { formatDateTime, safeJson } from '../../src/admin/helpers';
import { JsonModal, Panel, PrimaryButton, SecondaryButton, StatusPill, TextInput } from '../../src/admin/ui';
import { fetchAdminTransactions } from '../../src/services/api';

export default function AdminTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [jsonModal, setJsonModal] = useState<string | null>(null);

  const load = async () => {
    const data = await fetchAdminTransactions();
    setRows((data || []) as Array<Record<string, unknown>>);
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
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
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
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [row.provider, row.provider_tx_id, row.provider_transaction_id, row.order_id, row.status]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [rows, search]);

  return (
    <AdminPage title="Transactions">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="Provider Transactions"
          subtitle="Track provider transaction IDs and raw responses"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transaction" />
              <PrimaryButton onClick={() => void load()}>Refresh</PrimaryButton>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Provider</th>
                  <th className="px-2 py-3">Provider Transaction ID</th>
                  <th className="px-2 py-3">Order ID</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Created</th>
                  <th className="px-2 py-3">Response</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={String(row.id || idx)} className="border-b border-slate-900">
                    <td className="px-2 py-3 text-slate-300">{String(row.provider || '-')}</td>
                    <td className="px-2 py-3 font-mono text-xs text-slate-300">{String(row.provider_tx_id || row.provider_transaction_id || '-')}</td>
                    <td className="px-2 py-3 font-mono text-xs text-slate-300">{String(row.order_id || '-')}</td>
                    <td className="px-2 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-2 py-3 text-slate-400">{formatDateTime(row.created_at)}</td>
                    <td className="px-2 py-3">
                      <SecondaryButton onClick={() => setJsonModal(safeJson(row.response_data || row.response || row))}>View</SecondaryButton>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={6}>
                      {loading ? 'Loading transactions...' : 'No transactions found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <JsonModal open={Boolean(jsonModal)} title="Transaction Response Data" body={jsonModal || ''} onClose={() => setJsonModal(null)} />
    </AdminPage>
  );
}
