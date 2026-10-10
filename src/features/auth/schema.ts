import { z } from 'zod';

/** Indian mobile number, 10 digits, as typed after the +91 prefix. */
export const phoneLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit mobile number'),
});

export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;

export const otpVerificationSchema = z.object({
  phone: z.string().trim().min(1, 'Mobile number is required'),
  otp: z
    .string()
    .min(4, 'OTP must be at least 4 digits')
    .max(8, 'OTP must be at most 8 digits')
    .regex(/^[0-9]+$/, 'OTP must contain only numbers'),
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
