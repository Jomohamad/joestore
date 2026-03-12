import { queueJobService } from '../src/lib/server/services/queueJobs';
import { fraudSignalsService } from '../src/lib/server/services/fraudSignals';
import { heartbeatService } from '../src/lib/server/services/heartbeat';

const processJob = async (job: Record<string, unknown>) => {
  const jobType = String(job.job_type || '');
  const payload = (job.payload || {}) as Record<string, unknown>;

  if (jobType === 'fraud.ml_score') {
    await fraudSignalsService.record({
      userId: payload.userId ? String(payload.userId) : null,
      orderId: payload.orderId ? String(payload.orderId) : null,
      signalType: 'ml_score',
      score: Number(payload.score || 0),
      metadata: payload,
    });
    return;
  }
};

const run = async () => {
  const jobs = await queueJobService.listQueued(25);
  for (const job of jobs) {
    const jobId = String(job.id || '');
    if (!jobId) continue;
    try {
      await queueJobService.markRunning(jobId);
      await processJob(job as Record<string, unknown>);
      await queueJobService.markCompleted(jobId);
    } catch (error) {
      await queueJobService.markFailed(jobId, error instanceof Error ? error.message : 'Job failed');
    }
  }
};

const loop = async () => {
  try {
    await run();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[queueJobWorker] unhandled error', err);
  } finally {
    setTimeout(() => {
      void loop();
    }, 15_000);
  }
};

setInterval(() => {
  void heartbeatService.beat('queueJobWorker', { intervalMs: 15000 });
}, 30_000);

void loop();
