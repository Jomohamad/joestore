import crypto from 'crypto';

export const hmacSha256 = (secret: string, payload: string) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

export const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};
