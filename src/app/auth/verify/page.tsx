'use client';

import { AuthCard, AuthLayout } from '@/components/auth/shared';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

type CallbackState = 'processing' | 'success' | 'error';

// Capture URL params synchronously BEFORE Supabase cleans them
// This must be outside the component to run before hydration
const getInitialUrlState = () => {
	if (typeof window === 'undefined')
		return { type: null as string | null, hasCode: false };
	const hash = window.location.hash;
	const typeMatch = hash.match(/type=([^&]+)/);
	const hasCode = window.location.search.includes('code=');
	return {
		type: typeMatch ? typeMatch[1] : null,
		hasCode,
	};
};

/**
 * Generic auth verification handler for magic links.
 *
 * Routes users based on auth event/type:
 * - PASSWORD_RECOVERY → /auth/forgot-password (show reset form)
 * - SIGNED_IN + type=signup → /dashboard (email confirmed!)
 * - SIGNED_IN + type=email_change → /dashboard (email updated!)
 * - SIGNED_IN (default) → /dashboard
 */
function AuthVerifyHandler() {
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	// Capture URL state once on mount (before Supabase cleans the URL)
	const urlStateRef = useRef<{ type: string | null; hasCode: boolean } | null>(
		null
	);
	if (urlStateRef.current === null) {
		urlStateRef.current = getInitialUrlState();
	}

	const [state, setState] = useState<CallbackState>('processing');
	const [message, setMessage] = useState('Processing authentication...');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const supabase = getSharedSupabaseClient();
		const urlType = urlStateRef.current?.type;

		// Listen for auth events
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			if (!mounted) return;

			// Clean up URL
			window.history.replaceState(null, '', window.location.pathname);

			if (event === 'PASSWORD_RECOVERY') {
				// Redirect to forgot-password page for password reset
				router.replace('/auth/forgot-password');
				return;
			}

			if (event === 'SIGNED_IN') {
				// Handle different sign-in types
				if (urlType === 'signup') {
					setMessage('Email confirmed! Redirecting to dashboard...');
				} else if (urlType === 'email_change') {
					setMessage('Email updated! Redirecting to dashboard...');
				} else {
					setMessage('Signed in! Redirecting to dashboard...');
				}
				setState('success');

				// Redirect to dashboard after brief delay
				setTimeout(() => {
					if (mounted) {
						router.replace('/dashboard');
						router.refresh();
					}
				}, 1500);
				return;
			}
		});

		// Fallback: Check session after timeout
		// (in case event already fired before listener attached)
		const timeoutId = window.setTimeout(async () => {
			if (!mounted) return;

			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!mounted) return;

			if (session) {
				// User is signed in - check the URL type for appropriate message
				if (urlType === 'recovery') {
					// User arrived via recovery link but has session - redirect to reset
					router.replace('/auth/forgot-password');
					return;
				}

				// Default: signed in successfully
				if (urlType === 'signup') {
					setMessage('Email confirmed! Redirecting to dashboard...');
				} else if (urlType === 'email_change') {
					setMessage('Email updated! Redirecting to dashboard...');
				} else {
					setMessage('Signed in! Redirecting to dashboard...');
				}
				setState('success');

				setTimeout(() => {
					if (mounted) {
						router.replace('/dashboard');
						router.refresh();
					}
				}, 1500);
			} else {
				// No session - something went wrong
				setState('error');
				setErrorMessage(
					'Authentication failed. The link may have expired or already been used.'
				);
			}
		}, 1000);

		return () => {
			mounted = false;
			clearTimeout(timeoutId);
			subscription.unsubscribe();
		};
	}, [router]);

	if (state === 'processing') {
		return (
			<AuthCard title="Verifying..." subtitle={message}>
				<div className="flex flex-col items-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-primary-400 mb-4" />
				</div>
			</AuthCard>
		);
	}

	if (state === 'error') {
		return (
			<AuthCard title="Authentication Error" subtitle={errorMessage ?? undefined}>
				<div className="flex flex-col items-center py-4">
					<a
						href="/auth/sign-in"
						className="text-primary-400 hover:text-primary-300 transition-colors"
					>
						Return to Sign In
					</a>
				</div>
			</AuthCard>
		);
	}

	// Success state
	return (
		<AuthCard title="Success!">
			<motion.div
				className="text-center"
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.25, ease: easeOutQuart }
				}
			>
				<motion.div
					className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
					initial={shouldReduceMotion ? { scale: 1 } : { scale: 0.8 }}
					animate={{ scale: 1 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.3, delay: 0.1, ease: easeOutQuart }
					}
				>
					<CheckCircle2 className="w-8 h-8 text-emerald-400" />
				</motion.div>

				<p className="text-text-secondary mb-6">{message}</p>

				<div className="flex items-center justify-center">
					<Loader2 className="h-5 w-5 animate-spin text-primary-400" />
				</div>
			</motion.div>
		</AuthCard>
	);
}

export default function AuthVerify() {
	return (
		<AuthLayout>
			<Suspense
				fallback={
					<AuthCard title="Loading...">
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin text-primary-400" />
						</div>
					</AuthCard>
				}
			>
				<AuthVerifyHandler />
			</Suspense>
		</AuthLayout>
	);
}
