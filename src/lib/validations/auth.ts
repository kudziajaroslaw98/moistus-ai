import { z } from 'zod';

// Password requirements - match existing upgrade-anonymous patterns
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

// Sign-in schema
export const signInSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address')
		.transform((email) => email.toLowerCase().trim()),
	password: z.string().min(1, 'Password is required'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

// Sign-up form schema (Step 1: Form with all fields)
// Use z.input for form default values compatibility
const signUpFormSchemaBase = z.object({
	email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
	displayName: z.string().max(50, 'Display name must be 50 characters or less'),
	password: z
		.string()
		.min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
		.regex(
			PASSWORD_REGEX,
			'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		),
	confirmPassword: z.string().min(1, 'Please confirm your password'),
});

export const signUpFormSchema = signUpFormSchemaBase.refine(
	(data) => data.password === data.confirmPassword,
	{
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	}
);

export type SignUpFormData = z.infer<typeof signUpFormSchema>;

// OTP verification schema (Step 2)
export const otpSchema = z.object({
	email: z.string().email(),
	otp: z
		.string()
		.length(6, 'Verification code must be 6 digits')
		.regex(/^\d+$/, 'Verification code must contain only numbers'),
});

export type OtpFormData = z.infer<typeof otpSchema>;

// API request schemas for server-side validation
export const signUpInitiateRequestSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address')
		.transform((email) => email.toLowerCase().trim()),
	password: z
		.string()
		.min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
		.regex(
			PASSWORD_REGEX,
			'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		),
	display_name: z
		.string()
		.max(50, 'Display name must be 50 characters or less')
		.optional()
		.transform((name) => name?.trim() || undefined),
});

export type SignUpInitiateRequest = z.infer<typeof signUpInitiateRequestSchema>;

export const signUpVerifyOtpRequestSchema = z.object({
	email: z
		.string()
		.email('Please enter a valid email address')
		.transform((email) => email.toLowerCase().trim()),
	otp: z
		.string()
		.length(6, 'Verification code must be 6 digits')
		.regex(/^\d+$/, 'Verification code must contain only numbers'),
});

export type SignUpVerifyOtpRequest = z.infer<typeof signUpVerifyOtpRequestSchema>;

// Password strength checker helper
export const passwordRequirements = [
	{ check: (p: string) => p.length >= PASSWORD_MIN_LENGTH, text: 'At least 8 characters' },
	{ check: (p: string) => /[A-Z]/.test(p), text: 'One uppercase letter' },
	{ check: (p: string) => /[a-z]/.test(p), text: 'One lowercase letter' },
	{ check: (p: string) => /\d/.test(p), text: 'One number' },
] as const;

export function checkPasswordStrength(password: string): {
	isValid: boolean;
	requirements: Array<{ met: boolean; text: string }>;
} {
	const results = passwordRequirements.map((req) => ({
		met: req.check(password),
		text: req.text,
	}));

	return {
		isValid: results.every((r) => r.met),
		requirements: results,
	};
}
