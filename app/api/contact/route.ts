import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: String(error) },
      { status: 400 },
    );
  }
}

// // This route will handle email contact requests

// import { NextResponse } from 'next/server';
// import { Resend } from 'resend';
// import { contactSchema } from '@/lib/validators/contact.schema';

// const resend = new Resend(process.env.RESEND_API_KEY);

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     // Server-side validation
//     const data = contactSchema.parse(body);

//     console.log('Sending emails for:', data.name, data.email);
//     console.log('API Key exists:', !!process.env.RESEND_API_KEY);

//     // Admin Email
//     const adminResponse = await resend.emails.send({
//       from: 'Contact <no-reply@wisedrive.my>',
//       to: ['nurhafiz.zubir@wisedrive.com'],
//       subject: 'New Enterprise Contact Request',
//       html: `
//         <h2>New Contact Request</h2>
//         <p><strong>Name:</strong> ${data.name}</p>
//         <p><strong>Email:</strong> ${data.email}</p>
//         <p><strong>Company:</strong> ${data.company}</p>
//         <p><strong>Business Type:</strong> ${data.businessType}</p>
//         <p><strong>Phone:</strong> ${data.phone}</p>
//         <p><strong>Message:</strong> ${data.message}</p>
//       `,
//     });

//     console.log('Admin email response:', adminResponse);

//     // User Confirmation Email
//     const userResponse = await resend.emails.send({
//       from: 'Contact <no-reply@wisedrive.my>',
//       to: [data.email],
//       cc: ['nurhafiz.zubir@wisedrive.com'],
//       subject: 'Regarding your Wisedrive Enterprise Inquiry',
//       html: `
//         <p>Hi ${data.name},</p>
//         <p>Thank you for your interest in Wisedrive's B2B solutions. We've received your details regarding ${data.company} and our team is already looking into how we can best support your ${data.businessType} operations.</p>
//         <p>At Wisedrive, we believe in scaling through data you can trust. We'll be in touch within one business day to discuss how our AI-driven inspections and "Certified" badges can help you move inventory faster and secure your assets.</p>
//         <p>Need immediate info? Reply to this email with your specific challenges, and we'll make sure to have a tailored proposal ready for our call.</p>
//         <p>Best,<br>The Wisedrive Team</p>
//       `,
//     });

//     console.log('User email response:', userResponse);

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error('Contact form error:', error);
//     return NextResponse.json(
//       { error: 'Failed to send email', details: String(error) },
//       { status: 400 },
//     );
//   }
// }
