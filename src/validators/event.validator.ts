import { z } from 'zod';

const activitySchema = z.object({
  time: z.string().min(1, 'Activity time is required'),
  activity: z.string().min(1, 'Activity detail is required'),
});

export const eventSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().min(5, 'Description must be at least 5 characters'),
    banner: z.string().optional(),
    imageUrl: z.string().optional(),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    location: z.string().optional(),
    registrationEnabled: z.boolean().optional(),
    isFestival: z.boolean().optional(),
    schedule: z.array(activitySchema).optional(),
  }),
});

export const registrationSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(5, 'Phone number must be at least 5 characters'),
    guestsCount: z.number().int().min(1).optional(),
    status: z.enum(['Attending', 'Maybe', 'Checked In']).optional(),
    attended: z.boolean().optional(),
  }),
});
