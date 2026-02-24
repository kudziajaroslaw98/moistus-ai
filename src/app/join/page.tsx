'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	loadExistingJoinIdentity,
	normalizeDisplayName,
} from '@/helpers/sharing/join-identity';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Loader2, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { JoinPageLayout } from './join-page-layout';

const supabase = getSharedSupabaseClient();

const JoinRoomSchema = z.object({
	roomCode: z
		.string()
		.min(1, 'Room code is required')
		.regex(/^[A-Z0-9]{3}-?[A-Z0-9]{3}$/i, 'Invalid room code format')
		.transform((val) => val.replace('-', '').toUpperCase()),
	displayName: z
		.string()
		.min(1, 'Display name is required')
		.max(50, 'Display name must be less than 50 characters')
		.transform((val) => val.trim()),
});

type JoinRoomFormInput = z.input<typeof JoinRoomSchema>;
type JoinRoomFormOutput = z.output<typeof JoinRoomSchema>;

function JoinPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initialRoomCode = searchParams.get('code') || '';

	const [isJoining, setIsJoining] = useState(false);
	const [joinError, setJoinError] = useState<string>('');

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		getValues,
		watch,
	} = useForm<JoinRoomFormInput, unknown, JoinRoomFormOutput>({
		resolver: zodResolver(JoinRoomSchema),
		defaultValues: {
			roomCode: initialRoomCode.toUpperCase(),
			displayName: '',
		},
	});

	const watchedRoomCode = watch('roomCode');

	// Redirect if room code provided in URL
	useEffect(() => {
		if (initialRoomCode && /^[A-Z0-9]{3}-?[A-Z0-9]{3}$/i.test(initialRoomCode)) {
			router.replace(`/join/${initialRoomCode.toUpperCase()}`);
		}
	}, [initialRoomCode, router]);

	useEffect(() => {
		let isMounted = true;

		const prefillDisplayName = async () => {
			try {
				const identity = await loadExistingJoinIdentity(supabase);
				if (!isMounted || !identity.existingDisplayName) {
					return;
				}

				if (getValues('displayName')) {
					return;
				}

				setValue('displayName', identity.existingDisplayName);
			} catch (error) {
				console.warn('[join-page] failed to prefill display name:', error);
			}
		};

		void prefillDisplayName();

		return () => {
			isMounted = false;
		};
	}, [getValues, setValue]);

	// Format room code with dash as user types
	const formatRoomCode = (value: string) => {
		const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
		if (cleaned.length <= 3) return cleaned;
		return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}`;
	};

	const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatRoomCode(e.target.value);
		setValue('roomCode', formatted);
	};

	const ensureAuthenticated = async (displayName: string) => {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error || !user) {
			const normalizedDisplayName = normalizeDisplayName(displayName);
			const signInOptions = normalizedDisplayName
				? {
						options: {
							data: {
								display_name: normalizedDisplayName,
							},
						},
					}
				: undefined;
			const { data: authData, error: signInError } =
				await supabase.auth.signInAnonymously(signInOptions);

			if (signInError || !authData.user) {
				throw new Error('Failed to authenticate anonymously');
			}

			return authData.user;
		}

		return user;
	};

	const onSubmit: SubmitHandler<JoinRoomFormOutput> = async (data) => {
		setIsJoining(true);
		setJoinError('');

		try {
			const normalizedDisplayName = normalizeDisplayName(data.displayName);
			if (!normalizedDisplayName) {
				throw new Error('Display name is required');
			}

			await ensureAuthenticated(normalizedDisplayName);

			const response = await fetch('/api/share/join-room', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token: data.roomCode,
					display_name: normalizedDisplayName,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to join room');
			}

			const result = await response.json();
			router.push(`/mind-map/${result.data.map_id}`);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to join room';
			setJoinError(errorMessage);
		} finally {
			setIsJoining(false);
		}
	};

	return (
		<JoinPageLayout>
			{/* Hero text */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-8'
				initial={{ opacity: 0, y: 20 }}
				transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
			>
				<div className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-500/10 to-primary-500/10 px-4 py-2 text-sm font-medium text-primary-400 ring-1 ring-inset ring-primary-500/20 backdrop-blur-sm mb-6'>
					<Users className='h-4 w-4' />
					Real-time Collaboration
				</div>

				<h1 className='text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3'>
					Join a <span className='text-primary-400'>Mind Map</span>
				</h1>

				<p className='text-text-secondary text-base'>
					Enter your room code to start collaborating
				</p>
			</motion.div>

			{/* Glassmorphism card */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='p-8 rounded-2xl'
				initial={{ opacity: 0, y: 20 }}
				style={{
					background:
						'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
					border: '1px solid rgba(255, 255, 255, 0.06)',
					backdropFilter: 'blur(8px)',
				}}
				transition={{
					delay: 0.1,
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
				}}
			>
				<form className='space-y-5' onSubmit={handleSubmit(onSubmit)}>
					{/* Room Code Input */}
					<div className='space-y-2'>
						<Label
							className='text-sm font-medium text-text-secondary'
							htmlFor='roomCode'
						>
							Room Code
						</Label>

						<Input
							className='!h-14 text-center text-xl font-mono tracking-[0.3em] !bg-surface-primary/50 !border-border-secondary/50 !text-text-primary !placeholder:text-text-quaternary focus:!border-primary-500/60 focus:!ring-primary-500/20 focus:!ring-2 uppercase'
							disabled={isJoining}
							id='roomCode'
							maxLength={7}
							onChange={handleRoomCodeChange}
							placeholder='ABC-123'
							type='text'
							value={formatRoomCode(watchedRoomCode || '')}
						/>

						<AnimatePresence mode='wait'>
							{errors.roomCode && (
								<motion.p
									animate={{ opacity: 1, y: 0 }}
									className='text-sm text-red-400 flex items-center gap-1'
									exit={{ opacity: 0, y: -5 }}
									initial={{ opacity: 0, y: -5 }}
								>
									<AlertCircle className='h-3 w-3' />
									{errors.roomCode.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>

					{/* Display Name Input */}
					<div className='space-y-2'>
						<Label
							className='text-sm font-medium text-text-secondary'
							htmlFor='displayName'
						>
							Your Name
						</Label>

						<Input
							{...register('displayName')}
							className='!h-12 !bg-surface-primary/50 !border-border-secondary/50 !text-text-primary !placeholder:text-text-tertiary focus:!border-primary-500/60 focus:!ring-primary-500/20 focus:!ring-2'
							disabled={isJoining}
							id='displayName'
							placeholder='How should we call you?'
							type='text'
						/>

						<AnimatePresence mode='wait'>
							{errors.displayName && (
								<motion.p
									animate={{ opacity: 1, y: 0 }}
									className='text-sm text-red-400 flex items-center gap-1'
									exit={{ opacity: 0, y: -5 }}
									initial={{ opacity: 0, y: -5 }}
								>
									<AlertCircle className='h-3 w-3' />
									{errors.displayName.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>

					{/* Error Display */}
					<AnimatePresence>
						{joinError && (
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								className='p-3 rounded-lg bg-red-500/10 border border-red-500/20'
								exit={{ opacity: 0, scale: 0.95 }}
								initial={{ opacity: 0, scale: 0.95 }}
							>
								<p className='text-sm text-red-400 flex items-center gap-2'>
									<AlertCircle className='h-4 w-4 shrink-0' />
									{joinError}
								</p>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Submit Button */}
					<Button
						className='w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
						disabled={isJoining}
						type='submit'
					>
						<AnimatePresence mode='wait'>
							{isJoining ? (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='flex items-center gap-2'
									exit={{ opacity: 0, scale: 0.8 }}
									initial={{ opacity: 0, scale: 0.8 }}
									key='loading'
								>
									<Loader2 className='h-5 w-5 animate-spin' />
									<span>Joining room...</span>
								</motion.div>
							) : (
								<motion.div
									animate={{ opacity: 1 }}
									className='flex items-center gap-2'
									exit={{ opacity: 0 }}
									initial={{ opacity: 0 }}
									key='default'
								>
									<span>Join Room</span>
									<ArrowRight className='h-5 w-5' />
								</motion.div>
							)}
						</AnimatePresence>
					</Button>
				</form>

				{/* Info text */}
				<motion.p
					animate={{ opacity: 1 }}
					className='mt-6 text-center text-xs text-text-tertiary'
					initial={{ opacity: 0 }}
					transition={{ delay: 0.3 }}
				>
					You&apos;ll join as a guest. Create an account later to save your
					work.
				</motion.p>
			</motion.div>

			{/* Trust indicators */}
			<motion.div
				animate={{ opacity: 1 }}
				className='mt-6 flex items-center justify-center gap-6 text-sm text-text-tertiary'
				initial={{ opacity: 0 }}
				transition={{ delay: 0.4 }}
			>
				<div className='flex items-center gap-2'>
					<svg
						className='h-4 w-4 text-emerald-500'
						fill='currentColor'
						viewBox='0 0 20 20'
					>
						<path
							clipRule='evenodd'
							d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
							fillRule='evenodd'
						/>
					</svg>
					<span>No signup required</span>
				</div>

				<div className='flex items-center gap-2'>
					<svg
						className='h-4 w-4 text-emerald-500'
						fill='currentColor'
						viewBox='0 0 20 20'
					>
						<path
							clipRule='evenodd'
							d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
							fillRule='evenodd'
						/>
					</svg>
					<span>Real-time sync</span>
				</div>
			</motion.div>
		</JoinPageLayout>
	);
}

export default function JoinPage() {
	return (
		<Suspense
			fallback={
				<JoinPageLayout>
					<div className='flex items-center justify-center py-20'>
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							className='text-center space-y-4'
							initial={{ opacity: 0, scale: 0.9 }}
						>
							<Loader2 className='h-8 w-8 text-primary-400 mx-auto animate-spin' />
							<p className='text-text-secondary'>Loading...</p>
						</motion.div>
					</div>
				</JoinPageLayout>
			}
		>
			<JoinPageContent />
		</Suspense>
	);
}
