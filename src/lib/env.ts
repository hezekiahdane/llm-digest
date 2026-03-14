/**
 * Validated environment variables with fail-fast behavior.
 * Import from this module instead of accessing process.env directly.
 *
 * If a required variable is missing, the app will throw at startup
 * with a clear error message identifying the missing variable.
 */

import { z } from 'zod';

const envSchema = z.object({
  // ─── App ────────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('My App'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // ─── Resend (email) ──────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_FROM_EMAIL: z.string().email().default('no-reply@localhost'),
  RESEND_ADMIN_EMAIL: z.string().email().default('admin@localhost'),

  // ─── Supabase ────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n\n❌ Invalid environment variables:\n${formatted}\n\nSee .env.example for required variables.\n`,
    );
  }

  return result.data;
}

export const env = validateEnv();
