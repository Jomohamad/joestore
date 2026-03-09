import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../../src/admin/AdminPage';
import { safeJson } from '../../src/admin/helpers';
import { JsonModal, Panel, PrimaryButton, SecondaryButton, TextArea, TextInput } from '../../src/admin/ui';
import { fetchAdminSettings, updateAdminSetting } from '../../src/services/api';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');

  const [activeKey, setActiveKey] = useState('');
  const [activeDescription, setActiveDescription] = useState('');
  const [activeValue, setActiveValue] = useState('{}');
  const [editorOpen, setEditorOpen] = useState(false);

  const [jsonModal, setJsonModal] = useState<string | null>(null);

  const load = async () => {
    const data = await fetchAdminSettings();
    setSettings((data || []) as Array<Record<string, unknown>>);
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
        setError(err instanceof Error ? err.message : 'Failed to load settings');
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
    if (!q) return settings;
    return settings.filter((entry) => {
      const haystack = [entry.key, entry.description, safeJson(entry.value)].map((v) => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(q);
    });
  }, [settings, search]);

  const openEditor = (entry?: Record<string, unknown>) => {
    setActiveKey(String(entry?.key || ''));
    setActiveDescription(String(entry?.description || ''));
    setActiveValue(safeJson(entry?.value || {}));
    setEditorOpen(true);
  };

  const save = async () => {
    if (!activeKey.trim()) {
      setError('Setting key is required.');
      return;
    }

    let parsed: unknown = {};
    try {
      parsed = JSON.parse(activeValue || '{}');
    } catch {
      setError('Invalid JSON value.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateAdminSetting({
        key: activeKey.trim(),
        description: activeDescription.trim() || undefined,
        value: parsed,
      });
      setEditorOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Settings">
      <div className="space-y-6">
        {error ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

        <Panel
          title="System Settings"
          subtitle="Payment gateway config, API keys metadata, Redis and queue controls"
          actions={
            <>
              <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search settings" />
              <PrimaryButton onClick={() => openEditor()}>Add Setting</PrimaryButton>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-2 py-3">Key</th>
                  <th className="px-2 py-3">Description</th>
                  <th className="px-2 py-3">Value</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => (
                  <tr key={String(entry.id || idx)} className="border-b border-slate-900">
                    <td className="px-2 py-3 font-mono text-xs text-slate-300">{String(entry.key || '-')}</td>
                    <td className="px-2 py-3 text-slate-300">{String(entry.description || '-')}</td>
                    <td className="px-2 py-3 text-slate-300">
                      <div className="max-w-[420px] truncate">{safeJson(entry.value || {})}</div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton onClick={() => openEditor(entry)}>Edit</SecondaryButton>
                        <SecondaryButton onClick={() => setJsonModal(safeJson(entry.value || {}))}>View JSON</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-slate-400" colSpan={4}>
                      {loading ? 'Loading settings...' : 'No settings found.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-white">{activeKey ? 'Edit Setting' : 'Add Setting'}</h3>
            <div className="mt-4 space-y-3">
              <label className="space-y-1 block">
                <span className="text-xs uppercase text-slate-400">Key</span>
                <TextInput value={activeKey} onChange={(e) => setActiveKey(e.target.value)} placeholder="e.g. queue" />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs uppercase text-slate-400">Description</span>
                <TextInput value={activeDescription} onChange={(e) => setActiveDescription(e.target.value)} />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs uppercase text-slate-400">JSON Value</span>
                <TextArea rows={12} value={activeValue} onChange={(e) => setActiveValue(e.target.value)} className="w-full font-mono text-xs" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <SecondaryButton onClick={() => setEditorOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => void save()} disabled={saving}>{saving ? 'Saving...' : 'Save'}</PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      <JsonModal open={Boolean(jsonModal)} title="Setting Value" body={jsonModal || ''} onClose={() => setJsonModal(null)} />
    </AdminPage>
  );
}
