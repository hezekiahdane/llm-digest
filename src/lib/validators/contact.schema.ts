// This is the base validators for contact form
// Change this according to your project requirements

import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  company: z.string().min(2, 'Company is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Phone number is required'),
  businessType: z.enum(['Bank', 'Insurer', 'OEM', 'Other']),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters long')
    .optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
