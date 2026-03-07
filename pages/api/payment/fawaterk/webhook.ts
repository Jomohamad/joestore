import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../../src/lib/server/http';
import { ordersService } from '../../../../src/lib/server/services/orders';
import { enforceRateLimit } from '../../../../src/lib/server/rateLimit';

export const config = {
  api: {
    bodyParser: false,
  },
};

const readRawBody = async (req: NextApiRequest) => {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve());
    req.on('error', reject);
  });

  return Buffer.concat(chunks);
};

const firstHeader = (value: string | string[] | undefined) => {
  if (!value) return '';
  return Array.isArray(value) ? String(value[0] || '') : String(value);
};

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'payment:webhook', windowMs: 60_000, max: 200 });

  const rawBuffer = await readRawBody(req);
  const rawText = rawBuffer.toString('utf8').trim();

  let payload: Record<string, unknown> = {};
  if (rawText) {
    try {
      payload = (JSON.parse(rawText) || {}) as Record<string, unknown>;
    } catch {
      throw new ApiError(400, 'Invalid webhook JSON payload', 'INVALID_WEBHOOK_PAYLOAD');
    }
  } else if (req.body && typeof req.body === 'object') {
    payload = req.body as Record<string, unknown>;
  }

  const signature =
    firstHeader(req.headers['x-fawaterk-signature']) ||
    firstHeader(req.headers['x-signature']) ||
    firstHeader(req.headers.signature);

  const order = await ordersService.verifyPaymentAndFulfill(payload, {
    signature: signature || null,
    rawBody: rawText || null,
  });

  res.status(200).json({
    received: true,
    orderId: order.id,
    status: order.status,
  });
});
