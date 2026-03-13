import { supabaseAdmin } from '../supabaseAdmin';
import { serverEnv } from '../env';
import { isSafeExternalUrl } from '../urlSafety';

const webhookUrl = String(serverEnv.alertWebhookUrl || '').trim();

export const alertsService = {
  async log(type: string, message: string, metadata?: Record<string, unknown>) {
    try {
      await supabaseAdmin.from('alerts_log').insert({
        type,
        message,
        metadata: metadata || {},
      });
    } catch {
      // ignore log failures
    }
  },

  async notify(type: string, message: string, metadata?: Record<string, unknown>) {
    await this.log(type, message, metadata);
    if (!webhookUrl || !isSafeExternalUrl(webhookUrl)) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          metadata: metadata || {},
          env: serverEnv.nodeEnv,
        }),
      });
    } catch {
      // ignore webhook failures
    }
  },
};
