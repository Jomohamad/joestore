import crypto from 'crypto';

export const hmacSha256 = (secret: string, payload: string) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

export const safeEqual = (a: string, b: string) => {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
};
