import { supabaseAdmin } from '../supabaseAdmin';

export const auditService = {
  async log(input: {
    actorUserId?: string | null;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: input.actorUserId || null,
        action: input.action,
        resource_type: input.resourceType || null,
        resource_id: input.resourceId || null,
        metadata: input.metadata || {},
      });
    } catch {
      // ignore audit failures
    }
  },
};
