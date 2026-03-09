import { enqueueTopupRequest } from '../src/lib/server/queue/topupQueue';
import { supabaseAdmin } from '../src/lib/server/supabaseAdmin';

const runRetrySweep = async () => {
  const rows = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(25);

  if (rows.error) {
    // eslint-disable-next-line no-console
    console.error('[retryWorker] failed to load failed orders', rows.error.message);
    return;
  }

  for (const row of rows.data || []) {
    const orderId = String((row as Record<string, unknown>).id || '').trim();
    if (!orderId) continue;

    await enqueueTopupRequest({
      orderId,
      source: 'admin-retry',
      requestedAt: new Date().toISOString(),
    });
  }
};

const boot = async () => {
  await runRetrySweep();
  setInterval(() => {
    void runRetrySweep();
  }, 60_000);
};

void boot();
