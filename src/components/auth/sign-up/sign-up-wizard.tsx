'use client';

import { AuthCard } from '@/components/auth/shared';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import type { OAuthProvider } from '@/components/auth/shared/oauth-buttons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { FormStep } from './steps/form-step';
import { OtpStep } from './steps/otp-step';
import { SuccessStep } from './steps/success-step';

export type SignUpStep = 'form' | 'otp' | 'success';

interface SignUpState {
	step: SignUpStep;
	email: string;
	displayName: string;
	password: string;
	direction: 1 | -1;
	error: string | null;
	isLoading: boolean;
}

const initialState: SignUpState = {
	step: 'form',
	email: '',
	displayName: '',
	password: '',
	direction: 1,
	error: null,
	isLoading: false,
};

// Animation variants for step transitions (vertical slide, consistent with sign-in)
const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

const slideVariants = {
	enter: (direction: number) => ({
		y: direction > 0 ? 20 : -20,
		opacity: 0,
	}),
	center: {
		y: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		y: direction < 0 ? 20 : -20,
		opacity: 0,
	}),
};

const slideTransition = {
	duration: 0.25,
	ease: easeOutQuart,
} as const;

export function SignUpWizard() {
	const [state, setState] = useState<SignUpState>(initialState);
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	// Update state helper
	const updateState = useCallback((updates: Partial<SignUpState>) => {
		setState((prev) => ({ ...prev, ...updates }));
	}, []);

	// Handle form submission (Step 1 → Step 2)
	const handleFormSubmit = async (data: {
		email: string;
		displayName?: string;
		password: string;
	}) => {
		updateState({ isLoading: true, error: null });

		try {
			const response = await fetch('/api/auth/sign-up/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: data.email,
					password: data.password,
					display_name: data.displayName,
				}),
			});

			const result = await response.json();

			if (!response.ok || result.status !== 'success') {
				updateState({
					isLoading: false,
					error: result.error || result.statusText || 'Failed to create account',
				});
				return;
			}

			// Store data and proceed to OTP step
			updateState({
				email: data.email,
				displayName: data.displayName || '',
				password: data.password,
				step: 'otp',
				direction: 1,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			console.error('Sign-up error:', error);
			updateState({
				isLoading: false,
				error: 'An unexpected error occurred. Please try again.',
			});
		}
	};

	// Handle OTP verification (Step 2 → Step 3)
	const handleOtpSubmit = async (otp: string) => {
		updateState({ isLoading: true, error: null });

		try {
			const response = await fetch('/api/auth/sign-up/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: state.email,
					otp,
				}),
			});

			const result = await response.json();

			if (!response.ok || result.status !== 'success') {
				updateState({
					isLoading: false,
					error: result.error || result.statusText || 'Invalid verification code',
				});
				return;
			}

			// Refresh the session to ensure we have the latest auth state
			await getSharedSupabaseClient().auth.getSession();

			// Proceed to success step
			updateState({
				step: 'success',
				direction: 1,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			console.error('OTP verification error:', error);
			updateState({
				isLoading: false,
				error: 'An unexpected error occurred. Please try again.',
			});
		}
	};

	// Handle OTP resend
	const handleResendOtp = async () => {
		updateState({ isLoading: true, error: null });

		try {
			const response = await fetch('/api/auth/sign-up/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: state.email,
					password: state.password,
					display_name: state.displayName || undefined,
				}),
			});

			const result = await response.json();

			if (!response.ok || result.status !== 'success') {
				updateState({
					isLoading: false,
					error: result.error || result.statusText || 'Failed to resend code',
				});
				return;
			}

			updateState({ isLoading: false, error: null });
		} catch (error) {
			console.error('Resend OTP error:', error);
			updateState({
				isLoading: false,
				error: 'Failed to resend verification code. Please try again.',
			});
		}
	};

	// Handle OAuth sign-up
	const handleOAuthSignUp = async (provider: OAuthProvider) => {
		updateState({ isLoading: true, error: null });

		try {
			const { error } = await getSharedSupabaseClient().auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
				},
			});

			if (error) {
				updateState({
					isLoading: false,
					error: error.message,
				});
			}
			// OAuth redirects away, no need to update state on success
		} catch (error) {
			console.error('OAuth error:', error);
			updateState({
				isLoading: false,
				error: 'Failed to sign up with provider. Please try again.',
			});
		}
	};

	// Handle back navigation
	const handleBack = useCallback(() => {
		updateState({
			step: 'form',
			direction: -1,
			error: null,
		});
	}, [updateState]);

	// Handle redirect to dashboard
	const handleComplete = useCallback(() => {
		router.push('/dashboard');
		router.refresh();
	}, [router]);

	// Get step title and subtitle
	const getStepContent = () => {
		switch (state.step) {
			case 'form':
				return { title: 'Create account', subtitle: 'Start your journey with Shiko' };
			case 'otp':
				return { title: 'Verify email', subtitle: 'Check your inbox for a verification code' };
			case 'success':
				return { title: 'Welcome!', subtitle: 'Your account has been created' };
		}
	};

	const { title, subtitle } = getStepContent();

	return (
		<AuthCard title={title} subtitle={subtitle}>
			<AnimatePresence mode='wait' custom={state.direction}>
				{state.step === 'form' && (
					<motion.div
						key='form'
						custom={state.direction}
						variants={shouldReduceMotion ? undefined : slideVariants}
						initial='enter'
						animate='center'
						exit='exit'
						transition={shouldReduceMotion ? { duration: 0 } : slideTransition}
					>
						<FormStep
							onSubmit={handleFormSubmit}
							onOAuthSelect={handleOAuthSignUp}
							isLoading={state.isLoading}
							error={state.error}
							defaultValues={{
								email: state.email,
								displayName: state.displayName,
							}}
						/>
					</motion.div>
				)}

				{state.step === 'otp' && (
					<motion.div
						key='otp'
						custom={state.direction}
						variants={shouldReduceMotion ? undefined : slideVariants}
						initial='enter'
						animate='center'
						exit='exit'
						transition={shouldReduceMotion ? { duration: 0 } : slideTransition}
					>
						<OtpStep
							email={state.email}
							onSubmit={handleOtpSubmit}
							onResend={handleResendOtp}
							onBack={handleBack}
							isLoading={state.isLoading}
							error={state.error}
						/>
					</motion.div>
				)}

				{state.step === 'success' && (
					<motion.div
						key='success'
						custom={state.direction}
						variants={shouldReduceMotion ? undefined : slideVariants}
						initial='enter'
						animate='center'
						exit='exit'
						transition={shouldReduceMotion ? { duration: 0 } : slideTransition}
					>
						<SuccessStep
							displayName={state.displayName}
							onComplete={handleComplete}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</AuthCard>
	);
}
