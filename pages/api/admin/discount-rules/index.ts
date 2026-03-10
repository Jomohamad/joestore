import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../../src/lib/server/supabaseAdmin';
import { auditService } from '../../../../src/lib/server/services/audit';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAdminUser(req);

  if (req.method === 'GET') {
    const rows = await supabaseAdmin.from('discount_rules').select('*').order('created_at', { ascending: false });
    if (rows.error) throw rows.error;
    return res.status(200).json(rows.data || []);
  }

  if (req.method === 'POST') {
    const scope = String(req.body?.scope || '').trim();
    const percent = req.body?.percent !== undefined ? Number(req.body.percent) : null;
    const fixed = req.body?.fixed_amount !== undefined ? Number(req.body.fixed_amount) : null;
    const gameId = req.body?.game_id ? String(req.body.game_id) : null;
    const category = req.body?.category ? String(req.body.category) : null;
    const active = req.body?.active !== false;

    if (!scope) throw new ApiError(400, 'scope is required', 'VALIDATION_ERROR');

    const payload = {
      scope,
      percent: Number.isFinite(Number(percent)) ? Number(percent) : null,
      fixed_amount: Number.isFinite(Number(fixed)) ? Number(fixed) : null,
      game_id: gameId,
      category,
      active,
      starts_at: req.body?.starts_at ? String(req.body.starts_at) : null,
      ends_at: req.body?.ends_at ? String(req.body.ends_at) : null,
      max_uses: req.body?.max_uses ? Number(req.body.max_uses) : null,
    };

    const result = await supabaseAdmin.from('discount_rules').insert(payload).select('*').single();
    if (result.error) throw result.error;
    await auditService.log({
      actorUserId: auth.user.id,
      action: 'admin.discount_rules.create',
      resourceType: 'discount_rule',
      resourceId: String(result.data?.id || ''),
      metadata: payload,
    });
    return res.status(201).json(result.data);
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const id = String(req.body?.id || '').trim();
    if (!id) throw new ApiError(400, 'id is required', 'VALIDATION_ERROR');
    const updates = { ...req.body };
    delete (updates as Record<string, unknown>).id;
    const result = await supabaseAdmin.from('discount_rules').update(updates).eq('id', id).select('*').single();
    if (result.error) throw result.error;
    await auditService.log({
      actorUserId: auth.user.id,
      action: 'admin.discount_rules.update',
      resourceType: 'discount_rule',
      resourceId: id,
      metadata: updates as Record<string, unknown>,
    });
    return res.status(200).json(result.data);
  }

  if (req.method === 'DELETE') {
    const id = String(req.body?.id || req.query.id || '').trim();
    if (!id) throw new ApiError(400, 'id is required', 'VALIDATION_ERROR');
    const result = await supabaseAdmin.from('discount_rules').delete().eq('id', id).select('id').maybeSingle();
    if (result.error) throw result.error;
    await auditService.log({
      actorUserId: auth.user.id,
      action: 'admin.discount_rules.delete',
      resourceType: 'discount_rule',
      resourceId: id,
    });
    return res.status(200).json({ success: true, id });
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
});
