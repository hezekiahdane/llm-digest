/**
 * Email service — typed wrappers around the Resend API.
 *
 * All templates use React Email, which escapes values by default.
 * Never build email HTML via string interpolation.
 */

import { render } from '@react-email/render';
import { resend } from '@/lib/resend/client';
import { env } from '@/lib/core/env';
import { ContactAdminEmail } from '@/lib/resend/templates/contact-admin';
import { ContactConfirmationEmail } from '@/lib/resend/templates/contact-confirmation';
import type { ContactFormData } from '@/lib/validators/contact.schema';

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendContactEmails(
  data: ContactFormData,
): Promise<EmailResult> {
  const fromEmail = env.RESEND_FROM_EMAIL;
  const adminEmail = env.RESEND_ADMIN_EMAIL;

  if (!fromEmail || !adminEmail) {
    return { success: false, error: 'Email configuration is missing' };
  }

  try {
    const [adminHtml, userHtml] = await Promise.all([
      render(ContactAdminEmail({ data })),
      render(ContactConfirmationEmail({ name: data.name })),
    ]);

    // Send both emails in parallel
    const [adminResult, userResult] = await Promise.allSettled([
      resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `New contact request from ${data.name}`,
        html: adminHtml,
      }),
      resend.emails.send({
        from: fromEmail,
        to: [data.email],
        subject: `We received your message`,
        html: userHtml,
      }),
    ]);

    if (adminResult.status === 'rejected') {
      console.error('Failed to send admin email:', adminResult.reason);
    }

    if (userResult.status === 'rejected') {
      console.error('Failed to send confirmation email:', userResult.reason);
    }

    // Consider the operation successful if the admin email was sent
    if (adminResult.status === 'fulfilled' && adminResult.value.data) {
      return { success: true, id: adminResult.value.data.id };
    }

    return { success: false, error: 'Failed to send email' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email service error:', message);
    return { success: false, error: message };
  }
}
