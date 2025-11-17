'use client';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignIn() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

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
			router.push('/dashboard');
			router.refresh();
		}
	};

	return (
		<div className='flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4'>
			<div className='w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md'>
				<h1 className='text-center text-2xl font-bold text-zinc-100'>
					Sign In
				</h1>

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
		</div>
	);
}
