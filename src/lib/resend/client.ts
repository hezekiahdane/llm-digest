/**
 * Resend email client singleton.
 * Initialized with the validated API key from env.ts.
 */

import { Resend } from 'resend';
import { env } from '@/lib/core/env';

export const resend = new Resend(env.RESEND_API_KEY);
