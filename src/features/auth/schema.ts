import { z } from 'zod';

export const emailLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type EmailLoginInput = z.infer<typeof emailLoginSchema>;

export const otpVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  otp: z
    .string()
    .length(4, 'OTP must be exactly 4 digits')
    .regex(/^[0-9]{4}$/, 'OTP must contain only numbers'),
});

export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>;

const DOB_PATTERN = /^(0[1-9]|[12][0-9]|3[01]) \/ (0[1-9]|1[0-2]) \/ (19|20)[0-9]{2}$/;

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
  dob: z.string().trim().regex(DOB_PATTERN, 'Enter your date of birth as DD / MM / YYYY'),
  city: z.string().trim().min(2, 'Select your city'),
});

export type DriverProfileInput = z.infer<typeof driverProfileSchema>;
