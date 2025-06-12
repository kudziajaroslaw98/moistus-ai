'use client';

import { createClient } from '@/helpers/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const supabase = createClient();

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

interface JoinRoomProps {
	roomCode?: string;
	onJoinSuccessCallback: (result: {
		mapId: string;
		mapTitle: string;
		isAnonymous: boolean;
		userDisplayName: string;
	}) => void;
	onError?: (error: string) => void;
	className?: string;
}

export function JoinRoom({
	roomCode = '',
	onJoinSuccessCallback,
	onError,
	className = '',
}: JoinRoomProps) {
	const [isJoining, setIsJoining] = useState(false);
	const [joinError, setJoinError] = useState<string>('');
	const [currentUser, setCurrentUser] = useState<any>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<JoinRoomForm>({
		resolver: zodResolver(JoinRoomSchema),
		defaultValues: {
			roomCode: roomCode.toUpperCase(),
			displayName: '',
		},
	});

	const watchedRoomCode = watch('roomCode');

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
		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();

			if (error || !user) {
				// Sign in anonymously
				const { data: authData, error: signInError } =
					await supabase.auth.signInAnonymously();

				if (signInError || !authData.user) {
					throw new Error('Failed to authenticate anonymously');
				}

				setCurrentUser({
					id: authData.user.id,
					isAnonymous: true,
					displayName,
				});

				return authData.user;
			}

			setCurrentUser({
				id: user.id,
				isAnonymous: user.is_anonymous || false,
				displayName,
			});

			return user;
		} catch (error) {
			throw new Error(
				error instanceof Error ? error.message : 'Authentication failed'
			);
		}
	};

	const onSubmit = async (data: JoinRoomForm) => {
		setIsJoining(true);
		setJoinError('');

		try {
			// 1. Ensure user is authenticated
			await ensureAuthenticated(data.displayName);

			// 2. Join the room
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
			const joinResult = result.data;

			// 3. Call success callback
			onJoinSuccessCallback({
				mapId: joinResult.map_id,
				mapTitle: joinResult.map_title,
				isAnonymous: joinResult.is_anonymous,
				userDisplayName: joinResult.user_display_name,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to join room';
			setJoinError(errorMessage);
			onError?.(errorMessage);
		} finally {
			setIsJoining(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={`w-full max-w-md mx-auto ${className}`}
		>
			<div className='bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-xl'>
				<div className='text-center mb-6'>
					<h2 className='text-2xl font-bold text-white mb-2'>Join Room</h2>
					<p className='text-zinc-400 text-sm'>
						Enter the room code to collaborate on a mind map
					</p>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
					{/* Room Code Input */}
					<div>
						<label
							htmlFor='roomCode'
							className='block text-sm font-medium text-zinc-300 mb-2'
						>
							Room Code
						</label>
						<input
							id='roomCode'
							type='text'
							placeholder='ABC-123'
							className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-lg font-mono tracking-wider'
							value={formatRoomCode(watchedRoomCode || '')}
							onChange={handleRoomCodeChange}
							maxLength={7}
							disabled={isJoining}
						/>
						{errors.roomCode && (
							<p className='mt-1 text-sm text-red-400'>
								{errors.roomCode.message}
							</p>
						)}
					</div>

					{/* Display Name Input */}
					<div>
						<label
							htmlFor='displayName'
							className='block text-sm font-medium text-zinc-300 mb-2'
						>
							Your Display Name
						</label>
						<input
							id='displayName'
							type='text'
							placeholder='Enter your name'
							className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
							{...register('displayName')}
							disabled={isJoining}
						/>
						{errors.displayName && (
							<p className='mt-1 text-sm text-red-400'>
								{errors.displayName.message}
							</p>
						)}
					</div>

					{/* Error Display */}
					{joinError && (
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							className='p-3 bg-red-900/50 border border-red-700 rounded-md'
						>
							<p className='text-red-300 text-sm'>{joinError}</p>
						</motion.div>
					)}

					{/* Submit Button */}
					<motion.button
						type='submit'
						disabled={isJoining}
						className='w-full bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center'
						whileHover={{ scale: isJoining ? 1 : 1.02 }}
						whileTap={{ scale: isJoining ? 1 : 0.98 }}
					>
						{isJoining ? (
							<>
								<motion.div
									className='w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2'
									animate={{ rotate: 360 }}
									transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
								/>
								Joining Room...
							</>
						) : (
							'Join Room'
						)}
					</motion.button>
				</form>

				{/* Info Note */}
				<div className='mt-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded-md'>
					<p className='text-zinc-400 text-xs text-center'>
						You&apos;ll join as a guest. You can upgrade to a full account later
						to save your progress.
					</p>
				</div>
			</div>
		</motion.div>
	);
}
