'use client';

import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import {
	AuthCard,
	AuthLayout,
	OAuthButtons,
	OAuthDivider,
	type OAuthProvider,
} from '@/components/auth/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import useAppStore from '@/store/mind-map-store';
import { AlertCircle, Info, Loader2, Mail } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

function SignInForm() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [checkingAnonymous, setCheckingAnonymous] = useState(true);
	const router = useRouter();
	const searchParams = useSearchParams();
	const shouldReduceMotion = useReducedMotion();

	const redirectedFrom = searchParams.get('redirectedFrom');
	const message = searchParams.get('message');

	// Check if user has an anonymous session
	const { currentUser, userProfile, getCurrentUser } = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
			userProfile: state.userProfile,
			getCurrentUser: state.getCurrentUser,
		}))
	);

	const [isAnonymousUser, setIsAnonymousUser] = useState(false);

	useEffect(() => {
		const checkAnonymousStatus = async () => {
			let user = currentUser;

			// If no user in store, try to fetch from Supabase
			if (!user) {
				try {
					user = await getCurrentUser();
				} catch {
					// No user at all, show sign-in form
					setCheckingAnonymous(false);
					return;
				}
			}

			// Check if user is anonymous
			const profile = useAppStore.getState().userProfile;
			setIsAnonymousUser(profile?.is_anonymous ?? false);
			setCheckingAnonymous(false);
		};

		checkAnonymousStatus();
	}, [currentUser, userProfile, getCurrentUser]);

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const { error } = await getSharedSupabaseClient().auth.signInWithPassword({
			email,
			password,
		});

		setLoading(false);

		if (error) {
			setError(error.message);
		} else {
			// Redirect to original page or default to dashboard
			router.push(redirectedFrom || '/dashboard');
			router.refresh();
		}
	};

	const handleOAuthSignIn = async (provider: OAuthProvider) => {
		setError(null);
		setLoading(true);

		const { error } = await getSharedSupabaseClient().auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom || '/dashboard')}`,
			},
		});

		if (error) {
			setError(error.message);
			setLoading(false);
		}
		// Note: OAuth redirects away, so no need to setLoading(false) on success
	};

	const handleUpgradeSuccess = () => {
		// After successful upgrade, redirect to original page
		router.push(redirectedFrom || '/dashboard');
		router.refresh();
	};

	// Show loading while checking anonymous status
	if (checkingAnonymous) {
		return (
			<AuthCard>
				<div className='flex items-center justify-center py-8'>
					<div className='h-8 w-8 animate-spin rounded-full border-4 border-border-secondary border-t-primary-500' />
				</div>
			</AuthCard>
		);
	}

	// If user is anonymous, show upgrade prompt instead of sign-in form
	if (isAnonymousUser) {
		return (
			<AuthCard title='Upgrade Your Account'>
				{/* Info message explaining the situation */}
				<motion.div
					className='flex items-center gap-3 rounded-lg bg-primary-500/10 border border-primary-500/20 p-3 mb-6'
					initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { delay: 0.2, duration: 0.25, ease: easeOutQuart }
					}
				>
					<Info className='h-5 w-5 text-primary-400 shrink-0' />
					<p className='text-sm text-primary-300'>
						{message ||
							"You're currently using a guest account. Upgrade to keep your work and access all features."}
					</p>
				</motion.div>

				{/* The upgrade prompt modal will show immediately */}
				<UpgradeAnonymousPrompt
					isAnonymous={true}
					userDisplayName={
						userProfile?.display_name || userProfile?.full_name
					}
					onUpgradeSuccess={handleUpgradeSuccess}
					autoShowDelay={0}
				/>

				<motion.p
					className='text-center text-sm text-text-secondary mt-6'
					initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { delay: 0.3, duration: 0.25, ease: easeOutQuart }
					}
				>
					Already have an account?{' '}
					<button
						onClick={() => setIsAnonymousUser(false)}
						className='font-medium text-primary-400 hover:text-primary-300 transition-colors'
					>
						Sign in instead
					</button>
				</motion.p>
			</AuthCard>
		);
	}

	// Normal sign-in form for non-anonymous users
	return (
		<AuthCard title='Welcome back' subtitle='Sign in to your account'>
			{/* Info message when redirected from protected page */}
			<AnimatePresence>
				{message && (
					<motion.div
						className='flex items-center gap-3 rounded-lg bg-primary-500/10 border border-primary-500/20 p-3 mb-6'
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.25, ease: easeOutQuart }}
					>
						<Info className='h-5 w-5 text-primary-400 shrink-0' />
						<p className='text-sm text-primary-300'>{message}</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* OAuth Buttons */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.15, duration: 0.25, ease: easeOutQuart }
				}
			>
				<OAuthButtons
					onSelectProvider={handleOAuthSignIn}
					disabled={loading}
					label='sign-in'
				/>
			</motion.div>

			{/* Divider */}
			<motion.div
				className='my-6'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.2, duration: 0.25, ease: easeOutQuart }
				}
			>
				<OAuthDivider text='or sign in with email' />
			</motion.div>

			{/* Email Form */}
			<motion.form
				className='space-y-4'
				onSubmit={handleSignIn}
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.25, duration: 0.25, ease: easeOutQuart }
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
							required
							id='email'
							onChange={(e) => setEmail(e.target.value)}
							placeholder='you@example.com'
							type='email'
							value={email}
							disabled={loading}
							className='pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
						/>
					</div>
				</div>

				<div>
					<div className='flex items-center justify-between mb-2'>
						<label
							htmlFor='password'
							className='block text-sm font-medium text-text-secondary'
						>
							Password
						</label>
						<Link
							href='/auth/forgot-password'
							className='text-sm text-primary-400 hover:text-primary-300 transition-colors'
						>
							Forgot password?
						</Link>
					</div>
					<Input
						required
						id='password'
						onChange={(e) => setPassword(e.target.value)}
						placeholder='Enter your password'
						type='password'
						value={password}
						disabled={loading}
						className='h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
					/>
				</div>

				{/* Error message */}
				<AnimatePresence>
					{error && (
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
					)}
				</AnimatePresence>

				{/* Submit button - extra top margin to prevent accidental clicks */}
				<Button
					className='w-full h-12 mt-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200'
					disabled={loading}
					type='submit'
				>
					{loading ? (
						<>
							<Loader2 className='h-5 w-5 animate-spin mr-2' />
							Signing in...
						</>
					) : (
						'Sign In'
					)}
				</Button>
			</motion.form>

			<motion.p
				className='mt-6 text-center text-sm text-text-secondary'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.35, duration: 0.25, ease: easeOutQuart }
				}
			>
				Don&apos;t have an account?{' '}
				<Link
					className='font-medium text-primary-400 hover:text-primary-300 transition-colors'
					href='/auth/sign-up'
				>
					Sign Up
				</Link>
			</motion.p>
		</AuthCard>
	);
}

export default function SignIn() {
	return (
		<AuthLayout>
			<Suspense
				fallback={
					<AuthCard>
						<div className='flex items-center justify-center py-8'>
							<div className='h-8 w-8 animate-spin rounded-full border-4 border-border-secondary border-t-primary-500' />
						</div>
					</AuthCard>
				}
			>
				<SignInForm />
			</Suspense>
		</AuthLayout>
	);
}
