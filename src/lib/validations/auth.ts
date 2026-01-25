import { z } from 'zod';

// Password requirements - match existing upgrade-anonymous patterns
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

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
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address')
		.transform((s) => s.toLowerCase().trim()),
	displayName: z
		.string()
		.max(50, 'Display name must be 50 characters or less')
		.transform((s) => s.trim()),
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
	email: z
		.string()
		.email()
		.transform((s) => s.trim().toLowerCase()),
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

// Forgot password schema (email only)
export const forgotPasswordSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address')
		.transform((email) => email.toLowerCase().trim()),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password schema (new password + confirm)
const resetPasswordSchemaBase = z.object({
	password: z
		.string()
		.min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
		.regex(
			PASSWORD_REGEX,
			'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		),
	confirmPassword: z.string().min(1, 'Please confirm your password'),
});

export const resetPasswordSchema = resetPasswordSchemaBase.refine(
	(data) => data.password === data.confirmPassword,
	{
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	}
);

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Recovery OTP schema (just the 6-digit code)
export const recoveryOtpSchema = z.object({
	otp: z
		.string()
		.length(6, 'Verification code must be 6 digits')
		.regex(/^\d+$/, 'Verification code must contain only numbers'),
});

export type RecoveryOtpFormData = z.infer<typeof recoveryOtpSchema>;
