import { z } from 'zod';

import { getDobError } from '@/lib/dob';

/** Indian mobile number, 10 digits, as typed after the +91 prefix. */
export const phoneLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit mobile number'),
});

export const driverProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be less than 50 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, 'Enter your 10-digit mobile number')
    .transform((digits) => `+91${digits}`),
  dob: z
    .string()
    .trim()
    .superRefine((dob, ctx) => {
      const message = getDobError(dob);
      if (message) ctx.addIssue({ code: 'custom', message });
    }),
});
