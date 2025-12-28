'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type JoinRoomForm = z.infer<typeof JoinRoomSchema>;

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
		watch,
	} = useForm<JoinRoomForm>({
		resolver: zodResolver(JoinRoomSchema) as any,
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
			const { data: authData, error: signInError } =
				await supabase.auth.signInAnonymously();

			if (signInError || !authData.user) {
				throw new Error('Failed to authenticate anonymously');
			}

			return authData.user;
		}

		return user;
	};

	const onSubmit: SubmitHandler<JoinRoomForm> = async (data) => {
		setIsJoining(true);
		setJoinError('');

		try {
			await ensureAuthenticated(data.displayName);

			const response = await fetch('/api/share/join-room', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token: data.roomCode,
					display_name: data.displayName,
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
				<div className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500/10 to-sky-500/10 px-4 py-2 text-sm font-medium text-teal-400 ring-1 ring-inset ring-teal-500/20 backdrop-blur-sm mb-6'>
					<Users className='h-4 w-4' />
					Real-time Collaboration
				</div>

				<h1 className='text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3'>
					Join a <span className='text-teal-400'>Mind Map</span>
				</h1>

				<p className='text-zinc-400 text-base'>
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
							className='text-sm font-medium text-zinc-300'
							htmlFor='roomCode'
						>
							Room Code
						</Label>

						<Input
							className='!h-14 text-center text-xl font-mono tracking-[0.3em] !bg-zinc-900/50 !border-zinc-700/50 !text-zinc-100 !placeholder:text-zinc-600 focus:!border-teal-500/60 focus:!ring-teal-500/20 focus:!ring-2 uppercase'
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
							className='text-sm font-medium text-zinc-300'
							htmlFor='displayName'
						>
							Your Name
						</Label>

						<Input
							{...register('displayName')}
							className='!h-12 !bg-zinc-900/50 !border-zinc-700/50 !text-zinc-100 !placeholder:text-zinc-500 focus:!border-teal-500/60 focus:!ring-teal-500/20 focus:!ring-2'
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
									<AlertCircle className='h-4 w-4 flex-shrink-0' />
									{joinError}
								</p>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Submit Button */}
					<Button
						className='w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-medium shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
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
					className='mt-6 text-center text-xs text-zinc-500'
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
				className='mt-6 flex items-center justify-center gap-6 text-sm text-zinc-500'
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
							<Loader2 className='h-8 w-8 text-teal-400 mx-auto animate-spin' />
							<p className='text-zinc-400'>Loading...</p>
						</motion.div>
					</div>
				</JoinPageLayout>
			}
		>
			<JoinPageContent />
		</Suspense>
	);
}
