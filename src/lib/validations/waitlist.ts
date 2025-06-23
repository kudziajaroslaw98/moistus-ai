import { z } from 'zod';

// Email validation regex - more permissive than the default Zod email validator
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common disposable email domains (optional enhancement)
const disposableEmailDomains = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'temp-mail.org',
];

// Waitlist form schema
export const waitlistFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .refine(
      (email) => emailRegex.test(email),
      'Please enter a valid email address'
    )
    .refine(
      (email) => {
        const domain = email.split('@')[1]?.toLowerCase();
        return !disposableEmailDomains.includes(domain);
      },
      'Please use a permanent email address'
    )
    .transform((email) => email.toLowerCase().trim()),
});

// Type inference
export type WaitlistFormData = z.infer<typeof waitlistFormSchema>;

// Success response schema
export const waitlistSuccessSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  email: z.string().email().optional(),
});

export type WaitlistSuccessResponse = z.infer<typeof waitlistSuccessSchema>;

// Error response schema
export const waitlistErrorSchema = z.object({
  success: z.boolean(),
  error: z.string(),
  code: z.string().optional(),
});

export type WaitlistErrorResponse = z.infer<typeof waitlistErrorSchema>;
