import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, methodNotAllowed, withErrorHandling } from '../../../src/lib/server/http';
import { requireAuthUser } from '../../../src/lib/server/auth';
import { enforceRateLimit } from '../../../src/lib/server/rateLimit';
import { supabaseAdmin } from '../../../src/lib/server/supabaseAdmin';
import { parseBody, trimmedString } from '../../../src/lib/server/validation';
import { z } from 'zod';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

const detectMime = (bytes: Buffer): typeof ALLOWED_MIME[number] | null => {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WEBP: "RIFF"...."WEBP"
  const riff = bytes.toString('ascii', 0, 4);
  const webp = bytes.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  return null;
};

const extensionFor = (mime: typeof ALLOWED_MIME[number]) => {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb',
    },
  },
};

export default withErrorHandling(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  await enforceRateLimit(req, { key: 'profile:avatar', windowMs: 60_000, max: 20 });

  const { user } = await requireAuthUser(req);

  const schema = z.object({
    fileName: trimmedString(1, 120).optional(),
    contentType: z.string().trim().max(64),
    dataBase64: z.string().trim().min(20),
  }).strip();
  const { contentType, dataBase64 } = parseBody(req, schema);

  const safeContentType = String(contentType || '').toLowerCase();
  if (!ALLOWED_MIME.includes(safeContentType as typeof ALLOWED_MIME[number])) {
    throw new ApiError(400, 'Unsupported file type', 'AVATAR_INVALID_TYPE');
  }

  let base64 = dataBase64;
  if (base64.startsWith('data:')) {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(base64);
    if (!match) throw new ApiError(400, 'Invalid data URL', 'AVATAR_INVALID_PAYLOAD');
    base64 = match[2] || '';
  }

  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > MAX_AVATAR_BYTES) {
    throw new ApiError(400, 'File too large', 'AVATAR_TOO_LARGE', { maxBytes: MAX_AVATAR_BYTES });
  }

  const detected = detectMime(bytes);
  if (!detected || detected !== safeContentType) {
    throw new ApiError(400, 'File content type mismatch', 'AVATAR_TYPE_MISMATCH');
  }

  const extension = extensionFor(detected);
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, bytes, { upsert: true, contentType: detected });

  if (uploadError) {
    throw new ApiError(500, uploadError.message, 'AVATAR_UPLOAD_FAILED');
  }

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  res.status(200).json({ url: data.publicUrl, path });
});
