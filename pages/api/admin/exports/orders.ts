import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { supabaseAdmin } from '../../../../src/lib/server/supabaseAdmin';
import { auditService } from '../../../../src/lib/server/services/audit';

const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
};

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const auth = await requireAdminUser(req);

  const limit = Math.min(5000, Number(req.query.limit || 1000));
  const rows = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (rows.error) throw new ApiError(500, rows.error.message, 'EXPORT_FAILED');

  await auditService.log({
    actorUserId: auth.user.id,
    action: 'admin.export.orders',
    resourceType: 'orders',
    resourceId: `limit:${limit}`,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="orders_export.csv"`);
  res.status(200).send(toCsv(rows.data || []));
});
