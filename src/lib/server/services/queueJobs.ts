import { supabaseAdmin } from '../supabaseAdmin';

export const queueJobService = {
  async enqueue(jobType: string, payload: Record<string, unknown>, runAt?: string) {
    const result = await supabaseAdmin.from('queue_jobs').insert({
      job_type: jobType,
      payload,
      status: 'queued',
      run_at: runAt || new Date().toISOString(),
    }).select('*').single();
    if (result.error) throw result.error;
    return result.data;
  },

  async listQueued(limit = 25) {
    const rows = await supabaseAdmin
      .from('queue_jobs')
      .select('*')
      .eq('status', 'queued')
      .lte('run_at', new Date().toISOString())
      .order('run_at', { ascending: true })
      .limit(limit);
    if (rows.error) throw rows.error;
    return rows.data || [];
  },

  async markRunning(jobId: string) {
    await supabaseAdmin.from('queue_jobs').update({ status: 'running', updated_at: new Date().toISOString() }).eq('id', jobId);
  },

  async markCompleted(jobId: string) {
    await supabaseAdmin.from('queue_jobs').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', jobId);
  },

  async markFailed(jobId: string, error: string) {
    const current = await supabaseAdmin.from('queue_jobs').select('attempts').eq('id', jobId).maybeSingle();
    const attempts = Number(current.data?.attempts || 0) + 1;
    await supabaseAdmin.from('queue_jobs').update({
      status: 'failed',
      last_error: error,
      attempts,
      updated_at: new Date().toISOString(),
    }).eq('id', jobId);
  },
};
