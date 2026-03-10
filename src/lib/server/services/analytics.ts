import { supabaseAdmin } from '../supabaseAdmin';

export const analyticsService = {
  async track(input: { userId?: string | null; eventType: string; metadata?: Record<string, unknown> }) {
    try {
      const payload = {
        user_id: input.userId || null,
        event_type: input.eventType,
        metadata: input.metadata || {},
      };
      await supabaseAdmin.from('analytics_events').insert(payload);
    } catch {
      // ignore analytics failures
    }
  },
};
