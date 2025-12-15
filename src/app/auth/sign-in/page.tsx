'use client';

import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import useAppStore from '@/store/mind-map-store';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

function SignInForm() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [checkingAnonymous, setCheckingAnonymous] = useState(true);
	const router = useRouter();
	const searchParams = useSearchParams();

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
			// Need to get fresh profile from store after getCurrentUser
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

	const handleUpgradeSuccess = () => {
		// After successful upgrade, redirect to original page
		router.push(redirectedFrom || '/dashboard');
		router.refresh();
	};

	// Show loading while checking anonymous status
	if (checkingAnonymous) {
		return (
			<div className='w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md'>
				<div className='flex items-center justify-center'>
					<div className='h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-sky-500' />
				</div>
			</div>
		);
	}

	// If user is anonymous, show upgrade prompt instead of sign-in form
	if (isAnonymousUser) {
		return (
			<div className='w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md'>
				<h1 className='text-center text-2xl font-bold text-zinc-100'>
					Upgrade Your Account
				</h1>

				{/* Info message explaining the situation */}
				<div className='flex items-center gap-3 rounded-lg bg-sky-500/10 border border-sky-500/20 p-3'>
					<Info className='h-5 w-5 text-sky-400 flex-shrink-0' />
					<p className='text-sm text-sky-300'>
						{message ||
							"You're currently using a guest account. Upgrade to keep your work and access all features."}
					</p>
				</div>

				{/* The upgrade prompt modal will show immediately */}
				<UpgradeAnonymousPrompt
					isAnonymous={true}
					userDisplayName={
						userProfile?.display_name || userProfile?.full_name
					}
					onUpgradeSuccess={handleUpgradeSuccess}
					autoShowDelay={0}
				/>

				<p className='text-center text-sm text-zinc-400'>
					Already have an account?{' '}
					<button
						onClick={() => setIsAnonymousUser(false)}
						className='font-medium text-teal-400 hover:text-teal-300'
					>
						Sign in instead
					</button>
				</p>
			</div>
		);
	}

	// Normal sign-in form for non-anonymous users
	return (
		<div className='w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md'>
			<h1 className='text-center text-2xl font-bold text-zinc-100'>Sign In</h1>

			{/* Info message when redirected from protected page */}
			{message && (
				<div className='flex items-center gap-3 rounded-lg bg-sky-500/10 border border-sky-500/20 p-3'>
					<Info className='h-5 w-5 text-sky-400 flex-shrink-0' />
					<p className='text-sm text-sky-300'>{message}</p>
				</div>
			)}

			<form className='space-y-4' onSubmit={handleSignIn}>
				<FormField id='email' label='Email'>
					<Input
						required
						id='email'
						onChange={(e) => setEmail(e.target.value)}
						placeholder='you@example.com'
						type='email'
						value={email}
					/>
				</FormField>

				<FormField id='password' label='Password'>
					<Input
						required
						id='password'
						onChange={(e) => setPassword(e.target.value)}
						placeholder='••••••••'
						type='password'
						value={password}
					/>
				</FormField>

				{error && <p className='text-sm text-red-400'>{error}</p>}

				<Button className='w-full' disabled={loading} type='submit'>
					{loading ? 'Signing In...' : 'Sign In'}
				</Button>
			</form>

			<p className='mt-4 text-center text-sm text-zinc-400'>
				Don&apos;t have an account?{' '}
				<Link
					className='font-medium text-teal-400 hover:text-teal-300'
					href='/auth/sign-up'
				>
					Sign Up
				</Link>
			</p>
		</div>
	);
}

export default function SignIn() {
	return (
		<div className='flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4'>
			<Suspense
				fallback={
					<div className='w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md'>
						<div className='flex items-center justify-center'>
							<div className='h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-sky-500' />
						</div>
					</div>
				}
			>
				<SignInForm />
			</Suspense>
		</div>
	);
}
