import { z } from 'zod';

export const donationSchema = z.object({
  body: z.object({
    donorName: z.string().min(2, 'Donor name must be at least 2 characters'),
    mobile: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    donationType: z.string().optional(),
    type: z.string().optional(),
    amount: z.number().nonnegative('Amount cannot be negative').optional(),
    itemDescription: z.string().optional(),
    itemDetails: z.string().optional(),
    purpose: z.string().optional(),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    transactionReference: z.string().optional(),
    isPublic: z.boolean().optional(),
    status: z.enum(['Pending', 'Verified', 'Cancelled']).optional(),
    date: z.string().datetime().optional().or(z.string()).or(z.date()).optional(),
  }),
});
