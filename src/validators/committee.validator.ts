import { z } from 'zod';

export const committeeMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    designation: z.string().optional(),
    role: z.string().optional(),
    tenureStart: z.string().optional(),
    periodStart: z.string().optional(),
    tenureEnd: z.string().optional(),
    periodEnd: z.string().optional(),
    biography: z.string().optional(),
    bio: z.string().optional(),
    image: z.string().url('Invalid image URL').optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
    category: z.enum(['Current Committee', 'Past Member']).optional(),
    role_category: z.enum(['CHAIRMAN', 'GENERAL_SECRETARY', 'TREASURER', 'VICE_CHAIRMAN', 'JOINT_SECRETARY', 'ORGANISING_SECRETARY', 'EXECUTIVE_MEMBER', 'ADVISOR', 'PAST_MEMBER']).optional(),
    roleCategory: z.enum(['CHAIRMAN', 'GENERAL_SECRETARY', 'TREASURER', 'VICE_CHAIRMAN', 'JOINT_SECRETARY', 'ORGANISING_SECRETARY', 'EXECUTIVE_MEMBER', 'ADVISOR', 'PAST_MEMBER']).optional(),
    display_order: z.number().optional(),
    displayOrder: z.number().optional(),
    is_active: z.boolean().optional(),
    isActive: z.boolean().optional(),
    photo_url: z.string().optional().or(z.literal('')),
    photoUrl: z.string().optional().or(z.literal('')),
  }),
});
