import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../../src/lib/server/supabaseAdmin';
import { auditService } from '../../../../src/lib/server/services/audit';
import { paginationSchema, parseBody, parseQuery, trimmedString, optionalNullableTrimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAdminUser(req);

  if (req.method === 'GET') {
    const query = parseQuery(req, paginationSchema);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = Math.max(0, (page - 1) * limit);
    const rows = await supabaseAdmin
      .from('discount_rules')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (rows.error) throw rows.error;
    return res.status(200).json(rows.data || []);
  }

  if (req.method === 'POST') {
    const body = parseBody(
      req,
      z.object({
        scope: trimmedString(1, 40),
        percent: z.coerce.number().min(0).max(100).optional(),
        fixed_amount: z.coerce.number().min(0).optional(),
        game_id: optionalNullableTrimmedString(80),
        category: optionalNullableTrimmedString(80),
        active: z.boolean().optional(),
        starts_at: optionalNullableTrimmedString(40),
        ends_at: optionalNullableTrimmedString(40),
        max_uses: z.coerce.number().int().min(0).optional(),
      }).strip(),
    );
    const scope = String(body.scope || '').trim();
    const percent = body.percent !== undefined ? Number(body.percent) : null;
    const fixed = body.fixed_amount !== undefined ? Number(body.fixed_amount) : null;
    const gameId = body.game_id ? String(body.game_id) : null;
    const category = body.category ? String(body.category) : null;
    const active = body.active !== false;

    if (!scope) throw new ApiError(400, 'scope is required', 'VALIDATION_ERROR');

    const payload = {
      scope,
      percent: Number.isFinite(Number(percent)) ? Number(percent) : null,
      fixed_amount: Number.isFinite(Number(fixed)) ? Number(fixed) : null,
      game_id: gameId,
      category,
      active,
      starts_at: body.starts_at ? String(body.starts_at) : null,
      ends_at: body.ends_at ? String(body.ends_at) : null,
      max_uses: body.max_uses ? Number(body.max_uses) : null,
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
    const body = parseBody(
      req,
      z.object({
        id: trimmedString(1, 80),
      }).catchall(z.unknown()),
    );
    const id = String(body.id || '').trim();
    if (!id) throw new ApiError(400, 'id is required', 'VALIDATION_ERROR');
    const updates = { ...body } as Record<string, unknown>;
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
    const body = parseBody(
      req,
      z.object({
        id: trimmedString(1, 80).optional(),
      }).strip(),
    );
    const query = parseQuery(req, z.object({ id: trimmedString(1, 80).optional() }).strip());
    const id = String(body.id || query.id || '').trim();
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
