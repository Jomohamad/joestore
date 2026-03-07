import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../supabaseAdmin';

export const logsService = {
  async write(type: string, message: string, metadata?: Record<string, unknown>) {
    try {
      const { error } = await supabaseAdmin.from('logs').insert({
        id: randomUUID(),
        type,
        message,
        metadata: metadata || {},
      });

      if (error && error.code !== '42P01') {
        console.error('[logs:insert]', error.message);
      }
    } catch (error) {
      console.error('[logs:insert]', error);
    }
  },
};
