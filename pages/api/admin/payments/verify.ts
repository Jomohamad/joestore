import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { requireAdminUser } from '../../../../src/lib/server/auth';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { parseBody, trimmedString } from '../../../../src/lib/server/validation';
import { z } from 'zod';

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await requireAdminUser(req);

  const body = parseBody(
    req,
    z.object({
      paymentId: trimmedString(1, 80).optional(),
      payment_id: trimmedString(1, 80).optional(),
    }).strip(),
  );
  const paymentId = String(body.paymentId || body.payment_id || '').trim();
  if (!paymentId) throw new ApiError(400, 'paymentId is required', 'VALIDATION_ERROR');

  const payment = await ordersService.adminVerifyPayment(paymentId);
  res.status(200).json({ success: true, payment });
});
