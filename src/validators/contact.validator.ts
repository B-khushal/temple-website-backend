import { z } from 'zod';

export const contactMessageSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    mobile: z.string().optional(),
    phone: z.string().optional(),
    message: z.string().min(5, 'Message must be at least 5 characters'),
    status: z.enum(['New', 'Read', 'Replied', 'Archived']).optional(),
  }),
});
