import type { NextApiRequest, NextApiResponse } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

// Sensitive field names to redact from logs and error responses
const SENSITIVE_FIELDS = [
  'password', 'password_hash', 'token', 'secret', 'key', 'api_key',
  'authorization', 'credential', 'session', 'cookie', 'auth',
  'jwt', 'bearer', 'access_token', 'refresh_token', 'private_key'
];

// Redact sensitive values from objects for safe logging
const redactSensitive = (obj: unknown, depth = 0): unknown => {
  if (depth > 5) return '[max depth]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => redactSensitive(item, depth + 1));

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  private internalDetails?: unknown;

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown, internalDetails?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.internalDetails = internalDetails;
  }

  // Get details safe for client response (no internal info in production)
  getClientDetails(): unknown {
    if (!isProduction) {
      return redactSensitive(this.details);
    }
    // In production, only return user-facing details for client errors
    if (this.status < 500 && this.details) {
      return redactSensitive(this.details);
    }
    return undefined;
  }

  // Get full details for logging (always redact sensitive data)
  getLogDetails(): unknown {
    return redactSensitive({ ...this.details, ...this.internalDetails });
  }
}

export const methodNotAllowed = (res: NextApiResponse, allowed: string[]) => {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' });
};

export const withErrorHandling =
  (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const persistError = async (payload: {
      type: string;
      message: string;
      metadata?: Record<string, unknown>;
    }) => {
      try {
        const { logsService } = await import('./services/logs');
        // Redact sensitive data before logging
        const safeMetadata = redactSensitive(payload.metadata) as Record<string, unknown>;
        await logsService.write(payload.type, payload.message, safeMetadata);
      } catch {
        // Ignore logging failures to avoid recursive API errors.
      }
    };

    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        await persistError({
          type: 'api.error',
          message: error.message,
          metadata: {
            code: error.code,
            status: error.status,
            path: req.url || '',
            method: req.method || '',
            details: error.getLogDetails(),
          },
        });
        return res.status(error.status).json({
          error: error.message,
          code: error.code,
          details: error.getClientDetails(),
        });
      }

      // Log internal error details (redacted)
      console.error('[api:error]', isProduction ? '' : error);

      await persistError({
        type: 'api.unhandled_error',
        message: error instanceof Error ? error.message : 'Internal Server Error',
        metadata: {
          path: req.url || '',
          method: req.method || '',
          // Only include stack trace in development
          ...(isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
        },
      });

      // Return generic message in production to avoid leaking internal info
      const clientMessage = isProduction
        ? 'Internal Server Error'
        : (error instanceof Error ? error.message : 'Internal Server Error');

      return res.status(500).json({
        error: clientMessage,
        code: 'INTERNAL_ERROR',
        // Never expose internal error details to clients in production
        ...(isProduction ? {} : { details: redactSensitive(error) }),
      });
    }
  };
