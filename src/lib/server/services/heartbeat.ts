import { supabaseAdmin } from '../supabaseAdmin';

export const heartbeatService = {
  async beat(workerName: string, metadata?: Record<string, unknown>) {
    await supabaseAdmin.from('worker_heartbeats').upsert({
      worker_name: workerName,
      status: 'ok',
      metadata: metadata || {},
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'worker_name' });
  },
};
