import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { contactSchema } from '@/lib/validators/contact.schema';
import { contactFormLimiter } from '@/lib/rate-limit';
import { validateCsrfOrigin } from '@/lib/core/security/csrf';
import { sendContactEmails } from '@/lib/resend/service';
import { successResponse, errorResponse } from '@/lib/core/api/response';

export async function POST(req: Request) {
  // 1. CSRF origin check
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json(errorResponse('Forbidden'), { status: 403 });
  }

  // 2. Rate limiting per IP
  const ip =
    req.headers.get('x-forwarded-for') ??
    req.headers.get('x-real-ip') ??
    'anonymous';
  const { success: withinLimit } = contactFormLimiter.check(ip);
  if (!withinLimit) {
    return NextResponse.json(
      errorResponse('Too many requests. Please try again later.'),
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      },
    );
  }

  try {
    // 3. Validate and parse input
    const body = await req.json();
    const data = contactSchema.parse(body);

    // 4. Send emails via Resend
    const result = await sendContactEmails(data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse('Failed to send message. Please try again.'),
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(successResponse(null), { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ...errorResponse('Validation failed'), details: error.flatten() },
        { status: 422 },
      );
    }

    console.error('Contact form error:', error);
    return NextResponse.json(errorResponse('Internal server error'), {
      status: 500,
    });
  }
}
