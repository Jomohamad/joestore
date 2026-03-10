import type { NextApiRequest, NextApiResponse } from 'next';
import { methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { alertsService } from '../../../../src/lib/server/services/alerts';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  await alertsService.notify('admin.test', 'Test alert from admin panel', { source: 'admin' });
  res.status(200).json({ success: true });
});
