'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAppStore from '@/store/mind-map-store';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useShallow } from 'zustand/react/shallow';

type AccessDeniedReason = 'no_access' | 'not_found' | 'rate_limited';

// Animation easing following guidelines
const easeOutCubic = [0.215, 0.61, 0.355, 1] as const;

// Lock/shield illustration for access denied
function AccessIllustration() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.svg
			animate={
				shouldReduceMotion
					? {}
					: {
							y: [0, -8, 0],
						}
			}
			aria-hidden='true'
			className='w-48 h-48 text-zinc-600'
			fill='none'
			focusable='false'
			transition={
				shouldReduceMotion
					? {}
					: {
							duration: 4,
							ease: 'easeInOut',
							repeat: Infinity,
						}
			}
			viewBox='0 0 200 200'
			xmlns='http://www.w3.org/2000/svg'
		>
			<circle className='fill-zinc-800/50' cx='100' cy='100' r='90' />
			<path
				className='fill-zinc-700/80 stroke-zinc-600'
				d='M100 30 L160 55 L160 100 C160 140 130 170 100 180 C70 170 40 140 40 100 L40 55 L100 30Z'
				strokeWidth='2'
			/>
			<rect
				className='fill-zinc-600'
				height='45'
				rx='6'
				width='50'
				x='75'
				y='95'
			/>
			<path
				className='stroke-zinc-500'
				d='M85 95 L85 75 C85 60 115 60 115 75 L115 95'
				fill='none'
				strokeLinecap='round'
				strokeWidth='8'
			/>
			<circle className='fill-zinc-800' cx='100' cy='115' r='8' />
			<rect
				className='fill-zinc-800'
				height='15'
				rx='2'
				width='6'
				x='97'
				y='118'
			/>
			<circle className='fill-primary-500/20' cx='45' cy='45' r='8' />
			<circle className='fill-sky-500/20' cx='155' cy='45' r='6' />
			<circle className='fill-violet-500/20' cx='165' cy='155' r='10' />
			<circle className='fill-amber-500/20' cx='35' cy='145' r='7' />
		</motion.svg>
	);
}

// Document not found illustration
function NotFoundIllustration() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.svg
			animate={
				shouldReduceMotion
					? {}
					: {
							rotate: [0, 5, -5, 0],
						}
			}
			aria-hidden='true'
			className='w-48 h-48 text-zinc-600'
			fill='none'
			focusable='false'
			transition={
				shouldReduceMotion
					? {}
					: {
							duration: 6,
							ease: 'easeInOut',
							repeat: Infinity,
						}
			}
			viewBox='0 0 200 200'
			xmlns='http://www.w3.org/2000/svg'
		>
			<circle className='fill-zinc-800/50' cx='100' cy='100' r='90' />
			<rect
				className='fill-zinc-700/80 stroke-zinc-600'
				height='100'
				rx='8'
				strokeWidth='2'
				width='80'
				x='60'
				y='50'
			/>
			<path className='fill-zinc-600' d='M120 50 L140 70 L120 70 Z' />
			<text
				className='fill-zinc-500'
				dominantBaseline='middle'
				fontSize='48'
				fontWeight='bold'
				textAnchor='middle'
				x='100'
				y='110'
			>
				?
			</text>
			<circle className='fill-rose-500/20' cx='45' cy='55' r='8' />
			<circle className='fill-amber-500/20' cx='155' cy='65' r='6' />
			<circle className='fill-violet-500/20' cx='160' cy='145' r='10' />
		</motion.svg>
	);
}

// Rate limit illustration
function RateLimitIllustration() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.svg
			animate={
				shouldReduceMotion
					? {}
					: {
							scale: [1, 1.05, 1],
						}
			}
			aria-hidden='true'
			className='w-48 h-48 text-zinc-600'
			fill='none'
			focusable='false'
			transition={
				shouldReduceMotion
					? {}
					: {
							duration: 2,
							ease: 'easeInOut',
							repeat: Infinity,
						}
			}
			viewBox='0 0 200 200'
			xmlns='http://www.w3.org/2000/svg'
		>
			<circle className='fill-zinc-800/50' cx='100' cy='100' r='90' />
			{/* Clock face */}
			<circle
				className='fill-zinc-700/80 stroke-zinc-600'
				cx='100'
				cy='100'
				r='60'
				strokeWidth='4'
			/>
			{/* Hour marks */}
			{[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
				<line
					key={angle}
					className='stroke-zinc-500'
					strokeWidth='2'
					x1={100 + 50 * Math.cos((angle * Math.PI) / 180)}
					y1={100 + 50 * Math.sin((angle * Math.PI) / 180)}
					x2={100 + 55 * Math.cos((angle * Math.PI) / 180)}
					y2={100 + 55 * Math.sin((angle * Math.PI) / 180)}
				/>
			))}
			{/* Clock hands */}
			<line
				className='stroke-zinc-400'
				strokeLinecap='round'
				strokeWidth='4'
				x1='100'
				y1='100'
				x2='100'
				y2='60'
			/>
			<line
				className='stroke-zinc-500'
				strokeLinecap='round'
				strokeWidth='3'
				x1='100'
				y1='100'
				x2='130'
				y2='100'
			/>
			<circle className='fill-zinc-400' cx='100' cy='100' r='5' />
			<circle className='fill-amber-500/20' cx='45' cy='45' r='8' />
			<circle className='fill-rose-500/20' cx='155' cy='155' r='10' />
		</motion.svg>
	);
}

export function AccessDeniedContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	const reason =
		(searchParams.get('reason') as AccessDeniedReason) || 'no_access';

	const [roomCode, setRoomCode] = useState('');
	const [isJoining, setIsJoining] = useState(false);

	const { joinRoom, currentUser } = useAppStore(
		useShallow((state) => ({
			joinRoom: state.joinRoom,
			currentUser: state.currentUser,
		}))
	);

	const isAnonymous = !currentUser || currentUser.is_anonymous;

	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.3, ease: easeOutCubic };

	const handleJoinWithCode = async () => {
		// Prevent duplicate requests while joining
		if (isJoining) return;

		const trimmedCode = roomCode.trim().toUpperCase();
		if (!trimmedCode) {
			toast.error('Please enter a room code');
			return;
		}

		setIsJoining(true);
		try {
			const result = await joinRoom(trimmedCode);
			toast.success('Access granted!');
			router.push(`/mind-map/${result.map_id}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Invalid room code'
			);
		} finally {
			setIsJoining(false);
		}
	};

	const content = {
		not_found: {
			illustration: <NotFoundIllustration />,
			headline: 'Mind map not found',
			body: "This mind map doesn't exist or may have been deleted.",
			showRoomCode: false,
		},
		no_access: {
			illustration: <AccessIllustration />,
			headline: 'Access required',
			body: "You don't have permission to view this mind map. Enter a room code if you have one.",
			showRoomCode: true,
		},
		rate_limited: {
			illustration: <RateLimitIllustration />,
			headline: 'Too many requests',
			body: 'Please wait a moment before trying again.',
			showRoomCode: false,
		},
	};

	const current = content[reason] || content.no_access;

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950 p-4'>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='flex flex-col items-center text-center max-w-md w-full'
				initial={{ opacity: 0, y: 20 }}
				transition={transition}
			>
				{/* Illustration */}
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='mb-8'
					initial={{ opacity: 0, scale: 0.9 }}
					transition={{ ...transition, delay: 0.1 }}
				>
					{current.illustration}
				</motion.div>

				{/* Headline */}
				<motion.h1
					animate={{ opacity: 1, y: 0 }}
					className='text-2xl font-semibold text-white mb-3'
					initial={{ opacity: 0, y: 10 }}
					transition={{ ...transition, delay: 0.15 }}
				>
					{current.headline}
				</motion.h1>

				{/* Body */}
				<motion.p
					animate={{ opacity: 1, y: 0 }}
					className='text-zinc-400 text-sm leading-relaxed mb-8'
					initial={{ opacity: 0, y: 10 }}
					transition={{ ...transition, delay: 0.2 }}
				>
					{current.body}
				</motion.p>

				{/* Room Code Entry */}
				{current.showRoomCode && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 w-full mb-8'
						initial={{ opacity: 0, y: 10 }}
						transition={{ ...transition, delay: 0.25 }}
					>
						<div className='space-y-4'>
							<div className='space-y-2'>
								<Label
									htmlFor='room-code'
									className='text-sm text-zinc-400'
								>
									Have a room code?
								</Label>
								<Input
									id='room-code'
									placeholder='ABC-123'
									value={roomCode}
									onChange={(e) =>
										setRoomCode(e.target.value.toUpperCase())
									}
									onKeyDown={(e) =>
										e.key === 'Enter' && handleJoinWithCode()
									}
									className='text-center font-mono text-lg tracking-wider bg-zinc-800/50 border-zinc-700 focus:border-zinc-600'
								/>
							</div>
							<Button
								onClick={handleJoinWithCode}
								disabled={isJoining || !roomCode.trim()}
								className='w-full'
							>
								{isJoining ? 'Joining...' : 'Join with Code'}
							</Button>
						</div>
					</motion.div>
				)}

				{/* CTAs */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'
					initial={{ opacity: 0, y: 10 }}
					transition={{ ...transition, delay: 0.3 }}
				>
					<Link
						href={isAnonymous ? '/auth/signup' : '/dashboard'}
						className={cn(
							buttonVariants({ variant: 'default', size: 'lg' }),
							'w-full sm:w-auto'
						)}
					>
						{isAnonymous ? 'Create Free Account' : 'Go to Dashboard'}
					</Link>
					<Link
						href='/'
						className={cn(
							buttonVariants({ variant: 'outline', size: 'lg' }),
							'w-full sm:w-auto'
						)}
					>
						Back to Home
					</Link>
				</motion.div>

				{/* Additional help for anonymous users */}
				{isAnonymous && reason === 'no_access' && (
					<motion.p
						animate={{ opacity: 1 }}
						className='mt-8 text-xs text-zinc-500'
						initial={{ opacity: 0 }}
						transition={{ ...transition, delay: 0.35 }}
					>
						Create an account to build your own mind maps and collaborate
						with others.
					</motion.p>
				)}
			</motion.div>
		</div>
	);
}
