// This is the base validators for contact form
// Change this according to your project requirements

import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Name is required')
    .max(100, 'Name must be under 100 characters'),
  company: z
    .string()
    .min(2, 'Company is required')
    .max(200, 'Company must be under 200 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(7, 'Phone number is required')
    .max(20, 'Phone number must be under 20 characters'),
  businessType: z.enum(['Bank', 'Insurer', 'OEM', 'Other']),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters long')
    .max(5000, 'Message must be under 5000 characters')
    .optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
