import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../../src/lib/server/supabaseAdmin';
import { auditService } from '../../../../src/lib/server/services/audit';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAdminUser(req);

  if (req.method === 'GET') {
    const rows = await supabaseAdmin.from('provider_sla').select('*').order('provider', { ascending: true });
    if (rows.error) throw rows.error;
    return res.status(200).json(rows.data || []);
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const provider = String(req.body?.provider || '').trim().toLowerCase();
    if (!provider) throw new ApiError(400, 'provider is required', 'VALIDATION_ERROR');
    const payload = {
      provider,
      target_success_rate: Number(req.body?.target_success_rate || 95),
      target_latency_ms: Number(req.body?.target_latency_ms || 1500),
      enabled: req.body?.enabled !== false,
      updated_at: new Date().toISOString(),
    };
    const result = await supabaseAdmin.from('provider_sla').upsert(payload).select('*').single();
    if (result.error) throw result.error;
    await auditService.log({
      actorUserId: auth.user.id,
      action: 'admin.provider_sla.upsert',
      resourceType: 'provider_sla',
      resourceId: payload.provider,
      metadata: payload,
    });
    return res.status(200).json(result.data);
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'PATCH']);
});
