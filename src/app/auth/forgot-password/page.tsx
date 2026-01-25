'use client';

import { AuthCard, AuthLayout } from '@/components/auth/shared';
import {
	PasswordRequirementsInfo,
	PasswordStrengthBar,
} from '@/components/auth/shared/password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import {
	checkPasswordStrength,
	forgotPasswordSchema,
	recoveryOtpSchema,
	resetPasswordSchema,
	type ForgotPasswordFormData,
	type RecoveryOtpFormData,
	type ResetPasswordFormData,
} from '@/lib/validations/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Loader2,
	Mail,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

type Step = 'request' | 'verify' | 'reset' | 'success';

// Capture URL params synchronously BEFORE Supabase cleans them
// This must be outside the component to run before hydration
const getInitialUrlState = () => {
	if (typeof window === 'undefined') return { hadCode: false, hadRecovery: false };
	const hadCode = window.location.search.includes('code=');
	const hadRecovery = window.location.hash.includes('type=recovery');
	return { hadCode, hadRecovery };
};

function ForgotPasswordWizard() {
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	// Capture URL state once on mount (before Supabase cleans the URL)
	const urlStateRef = useRef<{ hadCode: boolean; hadRecovery: boolean } | null>(
		null
	);
	if (urlStateRef.current === null) {
		urlStateRef.current = getInitialUrlState();
	}

	const [step, setStep] = useState<Step>('request');
	const [email, setEmail] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const initialCheckDone = useRef(false);

	// Step 1: Request form
	const requestForm = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { email: '' },
	});

	// Step 2: OTP form
	const otpForm = useForm<RecoveryOtpFormData>({
		resolver: zodResolver(recoveryOtpSchema),
		defaultValues: { otp: '' },
	});

	// Step 3: Password form
	const passwordForm = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { password: '', confirmPassword: '' },
	});

	const password = passwordForm.watch('password');
	const { isValid: isPasswordStrong } = checkPasswordStrength(password || '');

	// On mount, check if user arrived via recovery link
	// Supabase's detectSessionInUrl handles the code exchange automatically
	// We just need to check if user is now authenticated with a recovery session
	useEffect(() => {
		if (initialCheckDone.current) return;
		initialCheckDone.current = true;

		const supabase = getSharedSupabaseClient();
		const arrivedWithRecoveryParams =
			urlStateRef.current?.hadCode || urlStateRef.current?.hadRecovery;

		// Listen for PASSWORD_RECOVERY event (fires when recovery link is processed)
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === 'PASSWORD_RECOVERY') {
				// Clean up URL if needed
				window.history.replaceState(null, '', window.location.pathname);
				setStep('reset');
				setIsCheckingSession(false);
			}
		});

		// Check if user already has a session (event might have already fired)
		const checkSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			// If we arrived with recovery params and have a session, show reset form
			// The code exchange already happened via detectSessionInUrl
			if (session && arrivedWithRecoveryParams) {
				// Clean up URL
				window.history.replaceState(null, '', window.location.pathname);
				setStep('reset');
				setIsCheckingSession(false);
				return;
			}

			setIsCheckingSession(false);
		};

		// Give Supabase time to exchange the code, then check session
		// The PASSWORD_RECOVERY event should fire, but this is a fallback
		setTimeout(checkSession, 500);

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	// Step 1: Request password reset
	const onRequestSubmit = async (data: ForgotPasswordFormData) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const supabase = getSharedSupabaseClient();
			// Always use localhost for local dev to match localStorage origin
			// (127.0.0.1 and localhost are different origins for localStorage)
			const origin =
				typeof window !== 'undefined' &&
				window.location.hostname === '127.0.0.1'
					? `http://localhost:${window.location.port}`
					: window.location.origin;

			const { error: resetError } = await supabase.auth.resetPasswordForEmail(
				data.email,
				{
					redirectTo: `${origin}/auth/forgot-password`,
				}
			);

			if (resetError) {
				setError(resetError.message);
				return;
			}

			setEmail(data.email);
			setStep('verify');
		} catch {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Step 2: Verify OTP
	const onOtpSubmit = async (data: RecoveryOtpFormData) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const supabase = getSharedSupabaseClient();
			const { error: verifyError } = await supabase.auth.verifyOtp({
				email,
				token: data.otp,
				type: 'recovery',
			});

			if (verifyError) {
				if (verifyError.message.includes('expired')) {
					setError('This code has expired. Please request a new one.');
				} else if (verifyError.message.includes('invalid')) {
					setError('Invalid verification code. Please check and try again.');
				} else {
					setError(verifyError.message);
				}
				return;
			}

			setStep('reset');
		} catch {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Step 3: Reset password
	const onPasswordSubmit = async (data: ResetPasswordFormData) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const supabase = getSharedSupabaseClient();
			const { error: updateError } = await supabase.auth.updateUser({
				password: data.password,
			});

			if (updateError) {
				if (updateError.message.includes('same password')) {
					setError(
						'New password must be different from your current password.'
					);
				} else {
					setError(updateError.message);
				}
				return;
			}

			setStep('success');

			// Redirect to dashboard after brief delay
			setTimeout(() => {
				router.push('/dashboard');
				router.refresh();
			}, 2000);
		} catch {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Get title and subtitle based on step
	const getStepContent = () => {
		switch (step) {
			case 'request':
				return {
					title: 'Forgot Password',
					subtitle:
						"Enter your email and we'll send you a code to reset your password.",
				};
			case 'verify':
				return {
					title: 'Verify Your Email',
					subtitle: `Enter the 6-digit code sent to ${email}`,
				};
			case 'reset':
				return {
					title: 'Set New Password',
					subtitle: 'Create a strong password for your account.',
				};
			case 'success':
				return {
					title: 'Password Updated!',
					subtitle: 'Your password has been successfully reset.',
				};
		}
	};

	const { title, subtitle } = getStepContent();

	// Show loading while checking if user arrived via recovery link
	if (isCheckingSession) {
		return (
			<AuthCard
				title='Loading...'
				subtitle='Please wait...'
			>
				<div className='flex flex-col items-center py-8'>
					<Loader2 className='h-8 w-8 animate-spin text-primary-400 mb-4' />
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title={title}
			subtitle={step !== 'success' ? subtitle : undefined}
		>
			<AnimatePresence mode='wait'>
				{/* Step 1: Request */}
				{step === 'request' && (
					<motion.form
						key='request'
						onSubmit={requestForm.handleSubmit(onRequestSubmit)}
						className='space-y-4'
						initial={
							shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
						}
						animate={{ opacity: 1, y: 0 }}
						exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.25, ease: easeOutQuart }
						}
					>
						<div>
							<label
								htmlFor='email'
								className='block text-sm font-medium text-text-secondary mb-2'
							>
								Email
							</label>
							<div className='relative'>
								<Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary pointer-events-none' />
								<Input
									id='email'
									type='email'
									placeholder='you@example.com'
									disabled={isSubmitting}
									className='pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
									{...requestForm.register('email')}
								/>
							</div>
							{requestForm.formState.errors.email && (
								<p className='mt-1 text-sm text-error-400'>
									{requestForm.formState.errors.email.message}
								</p>
							)}
						</div>

						<ErrorMessage error={error} />

						<Button
							type='submit'
							disabled={isSubmitting}
							className='w-full h-12 mt-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200'
						>
							{isSubmitting ? (
								<>
									<Loader2 className='h-5 w-5 animate-spin mr-2' />
									Sending...
								</>
							) : (
								'Send Reset Code'
							)}
						</Button>

						<p className='mt-6 text-center text-sm text-text-secondary'>
							Remember your password?{' '}
							<Link
								href='/auth/sign-in'
								className='font-medium text-primary-400 hover:text-primary-300 transition-colors'
							>
								Sign In
							</Link>
						</p>
					</motion.form>
				)}

				{/* Step 2: Verify OTP */}
				{step === 'verify' && (
					<motion.form
						key='verify'
						onSubmit={otpForm.handleSubmit(onOtpSubmit)}
						className='space-y-4'
						initial={
							shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
						}
						animate={{ opacity: 1, y: 0 }}
						exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.25, ease: easeOutQuart }
						}
					>
						{/* Info banner */}
						<div className='flex items-start gap-3 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20'>
							<Mail className='h-5 w-5 text-primary-400 shrink-0 mt-0.5' />
							<div className='text-sm'>
								<p className='text-primary-300'>
									We sent a 6-digit code to <strong>{email}</strong>
								</p>
								<p className='text-primary-400/70 mt-1'>
									You can also click the link in the email to verify
									automatically.
								</p>
							</div>
						</div>

						<div>
							<label
								htmlFor='otp'
								className='block text-sm font-medium text-text-secondary mb-2'
							>
								Verification Code
							</label>
							<Input
								id='otp'
								type='text'
								inputMode='numeric'
								placeholder='000000'
								maxLength={6}
								disabled={isSubmitting}
								className='h-12 bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.5em] font-mono placeholder:text-text-tertiary placeholder:tracking-[0.5em] focus:border-primary-500/50 focus:ring-primary-500/20'
								{...otpForm.register('otp')}
							/>
							{otpForm.formState.errors.otp && (
								<p className='mt-1 text-sm text-error-400'>
									{otpForm.formState.errors.otp.message}
								</p>
							)}
						</div>

						<ErrorMessage error={error} />

						<Button
							type='submit'
							disabled={isSubmitting}
							className='w-full h-12 mt-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200'
						>
							{isSubmitting ? (
								<>
									<Loader2 className='h-5 w-5 animate-spin mr-2' />
									Verifying...
								</>
							) : (
								'Verify Code'
							)}
						</Button>

						<div className='flex items-center justify-between mt-4'>
							<button
								type='button'
								onClick={() => {
									setStep('request');
									setError(null);
									otpForm.reset();
								}}
								className='text-sm text-text-secondary hover:text-text-primary transition-colors'
							>
								<ArrowLeft className='inline h-4 w-4 mr-1' />
								Back
							</button>
							<button
								type='button'
								onClick={() => {
									requestForm.handleSubmit(onRequestSubmit)();
								}}
								disabled={isSubmitting}
								className='text-sm text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50'
							>
								Resend code
							</button>
						</div>
					</motion.form>
				)}

				{/* Step 3: Reset Password */}
				{step === 'reset' && (
					<motion.form
						key='reset'
						onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
						className='space-y-4'
						initial={
							shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
						}
						animate={{ opacity: 1, y: 0 }}
						exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.25, ease: easeOutQuart }
						}
					>
						<div>
							<label
								htmlFor='password'
								className='flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-2'
							>
								New Password
								<PasswordRequirementsInfo password={password || ''} />
							</label>
							<Input
								id='password'
								type='password'
								placeholder='Enter new password'
								disabled={isSubmitting}
								className='h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
								{...passwordForm.register('password')}
							/>
							{passwordForm.formState.errors.password && (
								<p className='mt-1 text-sm text-error-400'>
									{passwordForm.formState.errors.password.message}
								</p>
							)}
							<PasswordStrengthBar password={password || ''} />
						</div>

						<div>
							<label
								htmlFor='confirmPassword'
								className='block text-sm font-medium text-text-secondary mb-2'
							>
								Confirm Password
							</label>
							<Input
								id='confirmPassword'
								type='password'
								placeholder='Confirm new password'
								disabled={isSubmitting}
								className='h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
								{...passwordForm.register('confirmPassword')}
							/>
							{passwordForm.formState.errors.confirmPassword && (
								<p className='mt-1 text-sm text-error-400'>
									{passwordForm.formState.errors.confirmPassword.message}
								</p>
							)}
						</div>

						<ErrorMessage error={error} />

						<Button
							type='submit'
							disabled={isSubmitting || !isPasswordStrong}
							className='w-full h-12 mt-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
						>
							{isSubmitting ? (
								<>
									<Loader2 className='h-5 w-5 animate-spin mr-2' />
									Updating Password...
								</>
							) : (
								'Update Password'
							)}
						</Button>
					</motion.form>
				)}

				{/* Success */}
				{step === 'success' && (
					<motion.div
						key='success'
						className='text-center'
						initial={
							shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
						}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.25, ease: easeOutQuart }
						}
					>
						<motion.div
							className='mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6'
							initial={shouldReduceMotion ? { scale: 1 } : { scale: 0.8 }}
							animate={{ scale: 1 }}
							transition={
								shouldReduceMotion
									? { duration: 0 }
									: { duration: 0.3, delay: 0.1, ease: easeOutQuart }
							}
						>
							<CheckCircle2 className='w-8 h-8 text-emerald-400' />
						</motion.div>

						<p className='text-text-secondary mb-6'>
							Your password has been successfully updated.
						</p>
						<p className='text-sm text-text-tertiary mb-6'>
							Redirecting to your dashboard...
						</p>

						<div className='flex items-center justify-center'>
							<Loader2 className='h-5 w-5 animate-spin text-primary-400' />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</AuthCard>
	);
}

function ErrorMessage({ error }: { error: string | null }) {
	if (!error) return null;

	return (
		<motion.div
			className='flex items-center gap-2 p-3 rounded-lg bg-error-500/10 border border-error-500/20'
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.2 }}
		>
			<AlertCircle className='h-4 w-4 text-error-400 shrink-0' />
			<p className='text-sm text-error-300'>{error}</p>
		</motion.div>
	);
}

export default function ForgotPassword() {
	return (
		<AuthLayout>
			<Suspense
				fallback={
					<AuthCard title='Loading...'>
						<div className='flex items-center justify-center py-8'>
							<Loader2 className='h-8 w-8 animate-spin text-primary-400' />
						</div>
					</AuthCard>
				}
			>
				<ForgotPasswordWizard />
			</Suspense>
		</AuthLayout>
	);
}
