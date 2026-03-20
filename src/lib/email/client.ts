/**
 * Resend email client singleton.
 * Returns null when RESEND_API_KEY is not set (graceful degradation).
 */

import { Resend } from 'resend';
import { env } from '@/lib/core/env';

export const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;
