import type { NextApiRequest } from 'next';
import { z } from 'zod';
import { ApiError } from './http';

const issueSummary = (issues: z.ZodIssue[]) =>
  issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

export const parseBody = <T>(req: NextApiRequest, schema: z.ZodType<T>): T => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    throw new ApiError(400, 'Invalid request payload', 'VALIDATION_ERROR', {
      issues: issueSummary(result.error.issues),
    });
  }
  return result.data;
};

export const parseQuery = <T>(req: NextApiRequest, schema: z.ZodType<T>): T => {
  const result = schema.safeParse(req.query ?? {});
  if (!result.success) {
    throw new ApiError(400, 'Invalid request query', 'VALIDATION_ERROR', {
      issues: issueSummary(result.error.issues),
    });
  }
  return result.data;
};

export const trimmedString = (min = 1, max = 255) =>
  z.string().trim().min(min, { message: `Must be at least ${min} characters` }).max(max);

export const optionalTrimmedString = (max = 255) =>
  z.string().trim().max(max).optional();

export const optionalNullableTrimmedString = (max = 255) =>
  z.string().trim().max(max).optional().nullable();

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email();

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[A-Za-z0-9._-]+$/);

export const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value), { message: 'Invalid currency code' });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strip();
