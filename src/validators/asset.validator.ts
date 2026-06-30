import { z } from 'zod';

export const assetSchema = z.object({
  body: z.object({
    assetName: z.string().optional(),
    name: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    acquisitionDate: z.string().or(z.date()),
    purchaseValue: z.number().nonnegative('Purchase value cannot be negative'),
    currentValue: z.number().nonnegative('Current value cannot be negative').optional(),
    currentValuation: z.number().nonnegative('Current valuation cannot be negative').optional(),
    location: z.string().min(1, 'Location is required'),
    image: z.string().optional(),
    imageUrl: z.string().optional(),
    notes: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Disposed']).optional(),
  }),
});

export const assetValuationSchema = z.object({
  body: z.object({
    value: z.number().positive('Valuation must be greater than zero'),
    notes: z.string().min(1, 'Reason/notes for revaluation are required'),
  }),
});
