import { z } from 'zod';

export const transactionSchema = z.object({
  body: z.object({
    type: z.enum(['Income', 'Expense']),
    category: z.string().min(1, 'Category is required'),
    amount: z.number().positive('Amount must be greater than zero'),
    description: z.string().optional(),
    date: z.string().datetime().optional().or(z.string()).or(z.date()).optional(),
    reference: z.string().optional(),
    approvedBy: z.string().optional(),
  }),
});

export const budgetSchema = z.object({
  body: z.object({
    category: z.string().min(1, 'Category is required'),
    amount: z.number().nonnegative('Budget amount cannot be negative'),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12).optional(),
  }),
});
