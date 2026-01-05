'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import {
	generateFallbackAvatar,
	generateFunName,
} from '@/helpers/user-profile-helpers';
import useAppStore from '@/store/mind-map-store';
import type { JoinRoomResult } from '@/store/slices/sharing-slice';
import {
	AlertCircle,
	ArrowRight,
	CheckCircle,
	LogOut,
	Sparkles,
	Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { JoinPageLayout } from '../join-page-layout';

interface JoinRoomPageProps {
	params: Promise<{
		token: string;
	}>;
}

interface AuthenticatedUserInfo {
	userId: string;
	displayName: string;
	email?: string;
	avatarUrl?: string;
	isAnonymous: boolean;
}

// Glassmorphism card component for consistent styling
function GlassCard({
	children,
	className = '',
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className={`p-8 rounded-2xl ${className}`}
			initial={{ opacity: 0, y: 20 }}
			style={{
				background:
					'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
				border: '1px solid rgba(255, 255, 255, 0.06)',
				backdropFilter: 'blur(8px)',
			}}
			transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
		>
			{children}
		</motion.div>
	);
}

// Loading dots animation
function LoadingDots({ color = 'primary' }: { color?: 'primary' | 'green' }) {
	const colorClass = color === 'primary' ? 'bg-primary-400' : 'bg-green-400';
	return (
		<div className='flex items-center justify-center gap-1'>
			{[0, 1, 2].map((i) => (
				<motion.div
					className={`w-2 h-2 ${colorClass} rounded-full`}
					key={i}
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.5, 1, 0.5],
					}}
					transition={{
						duration: 1.5,
						repeat: Infinity,
						delay: i * 0.2,
					}}
				/>
			))}
		</div>
	);
}

export default function JoinRoomPage({ params }: JoinRoomPageProps) {
	const { token } = use(params);
	const router = useRouter();
	const {
		joinRoom,
		ensureAuthenticated,
		isJoiningRoom,
		sharingError,
		clearError,
	} = useAppStore();

	const [displayName, setDisplayName] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [step, setStep] = useState<
		| 'validating'
		| 'display-name'
		| 'confirm-join'
		| 'joining'
		| 'success'
		| 'error'
	>('validating');
	const [joinResult, setJoinResult] = useState<JoinRoomResult | null>(null);
	const [authenticatedUser, setAuthenticatedUser] =
		useState<AuthenticatedUserInfo | null>(null);

	useEffect(() => {
		const validateTokenAndPrepare = async () => {
			try {
				clearError();

				const upperToken = token?.toUpperCase();

				if (!upperToken || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i.test(upperToken)) {
					setStep('error');
					return;
				}

				const supabase = getSharedSupabaseClient();
				const {
					data: { session },
					error: sessionError,
				} = await supabase.auth.getSession();

				if (sessionError) {
					console.warn('Session check failed:', sessionError);
				}

				if (session?.user) {
					const { data: profile, error: profileError } = await supabase
						.from('user_profiles')
						.select('user_id, display_name, email, avatar_url, is_anonymous')
						.eq('user_id', session.user.id)
						.single();

					if (profileError) {
						console.warn('Profile fetch failed:', profileError);
					}

					if (profile && !profile.is_anonymous) {
						const userId = profile.user_id;
						setAuthenticatedUser({
							userId,
							displayName:
								profile.display_name ||
								profile.email?.split('@')[0] ||
								generateFunName(userId),
							email: profile.email || undefined,
							avatarUrl: profile.avatar_url || generateFallbackAvatar(userId),
							isAnonymous: false,
						});

						setStep('confirm-join');
						setIsLoading(false);
						return;
					}
				}

				const defaultName = `User ${Date.now().toString().slice(-4)}`;
				setDisplayName(defaultName);
				setStep('display-name');
			} catch (error) {
				console.error('Error validating token:', error);
				setStep('error');
			} finally {
				setIsLoading(false);
			}
		};

		validateTokenAndPrepare();
	}, [token, clearError]);

	const handleJoinRoom = async () => {
		if (authenticatedUser && !authenticatedUser.isAnonymous) {
			setStep('joining');

			try {
				const result = await joinRoom(token.toUpperCase());
				setJoinResult(result);
				setStep('success');

				toast.success(`Joined as ${authenticatedUser.displayName}!`);

				setTimeout(() => {
					router.push(`/mind-map/${result.map_id}`);
				}, 1500);
			} catch (error) {
				console.error('Failed to join room:', error);
				setStep('error');
				toast.error(
					error instanceof Error ? error.message : 'Failed to join room'
				);
			}
			return;
		}

		if (!displayName.trim()) {
			toast.error('Please enter your name');
			return;
		}

		setStep('joining');

		try {
			const isAuthenticated = await ensureAuthenticated(displayName.trim());

			if (!isAuthenticated) {
				throw new Error('Failed to authenticate');
			}

			const result = await joinRoom(token.toUpperCase(), displayName.trim());
			setJoinResult(result);
			setStep('success');

			toast.success('Successfully joined the room!');

			setTimeout(() => {
				router.push(`/mind-map/${result.map_id}`);
			}, 1500);
		} catch (error) {
			console.error('Failed to join room:', error);
			setStep('error');
			toast.error(
				error instanceof Error ? error.message : 'Failed to join room'
			);
		}
	};

	// Validating state
	if (isLoading || step === 'validating') {
		return (
			<JoinPageLayout>
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-6'
					initial={{ opacity: 0, scale: 0.9 }}
				>
					<div className='relative inline-block'>
						<motion.div
							animate={{ rotate: 360 }}
							className='w-16 h-16 rounded-full border-2 border-primary-400/30 border-t-primary-400'
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
						/>
						<Sparkles className='absolute inset-0 m-auto h-6 w-6 text-primary-400' />
					</div>

					<div className='space-y-2'>
						<h2 className='text-xl font-semibold text-text-primary'>
							Preparing Your Access
						</h2>
						<p className='text-text-secondary'>Validating room code...</p>
					</div>

					<LoadingDots />
				</motion.div>
			</JoinPageLayout>
		);
	}

	// Error state
	if (step === 'error' || sharingError) {
		return (
			<JoinPageLayout>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='text-center mb-8'
					data-testid='join-error-state'
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
				>
					<div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-6'>
						<AlertCircle className='h-8 w-8 text-red-400' />
					</div>

					<h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3'>
						Unable to Join Room
					</h1>

					<p className='text-text-secondary text-base'>
						{sharingError?.message || 'Invalid or expired room code'}
					</p>
				</motion.div>

				<GlassCard>
					<div className='space-y-4'>
						<div className='p-4 rounded-lg bg-red-500/5 border border-red-500/10'>
							<p className='text-sm text-text-secondary'>
								Room code:{' '}
								<code className='font-mono text-red-400 bg-red-500/10 px-2 py-1 rounded'>
									{token}
								</code>
							</p>
						</div>

						<Button
							className='w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/25'
							onClick={() => router.push('/dashboard')}
						>
							Go to Dashboard
						</Button>

						<Button
							className='w-full'
							onClick={() => window.location.reload()}
							variant='ghost'
						>
							Try Again
						</Button>
					</div>
				</GlassCard>
			</JoinPageLayout>
		);
	}

	// Success state
	if (step === 'success') {
		return (
			<JoinPageLayout>
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-6'
					initial={{ opacity: 0, scale: 0.9 }}
				>
					<motion.div
						animate={{ scale: 1 }}
						className='relative inline-block'
						initial={{ scale: 0 }}
						transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
					>
						<div className='w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center'>
							<CheckCircle className='h-10 w-10 text-green-400' />
						</div>
						<motion.div
							animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
							className='absolute inset-0 rounded-full bg-green-500/20'
							transition={{ duration: 2, repeat: Infinity }}
						/>
					</motion.div>

					<div className='space-y-2'>
						<h2 className='text-2xl font-bold text-text-primary'>
							Welcome
							{authenticatedUser ? `, ${authenticatedUser.displayName}` : ''}!
						</h2>
						<p className='text-text-secondary'>
							Redirecting you to the collaboration...
						</p>
					</div>

					<LoadingDots color='green' />
				</motion.div>
			</JoinPageLayout>
		);
	}

	// Joining state
	if (step === 'joining') {
		return (
			<JoinPageLayout>
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-6'
					initial={{ opacity: 0, scale: 0.9 }}
				>
					<div className='relative inline-block'>
						<motion.div
							animate={{ rotate: 360 }}
							className='w-16 h-16 rounded-full border-2 border-primary-400/30 border-t-primary-400'
							transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
						/>
						<Users className='absolute inset-0 m-auto h-6 w-6 text-primary-400' />
					</div>

					<div className='space-y-2'>
						<h2 className='text-xl font-semibold text-text-primary'>
							Joining Room
						</h2>
						<p className='text-text-secondary'>
							{authenticatedUser
								? 'Connecting with your account...'
								: 'Setting up your session...'}
						</p>
					</div>

					<LoadingDots />
				</motion.div>
			</JoinPageLayout>
		);
	}

	// Confirm join for authenticated users
	if (step === 'confirm-join' && authenticatedUser) {
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
						Collaboration Invite
					</div>

					<h1 className='text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3'>
						Join <span className='text-primary-400'>Mind Map</span>
					</h1>

					<p className='text-text-secondary text-base'>
						You&apos;re about to join a shared workspace
					</p>
				</motion.div>

				<GlassCard>
					<div className='space-y-6'>
						{/* Room Code */}
						<div className='flex items-center justify-between p-4 rounded-lg bg-surface-primary/50 border border-border-secondary/50'>
							<span className='text-sm text-text-secondary'>Room Code</span>
							<code className='text-lg font-mono tracking-wider text-primary-400'>
								{token}
							</code>
						</div>

						{/* User Profile */}
						<div className='space-y-3'>
							<p className='text-sm font-medium text-text-secondary'>Joining as:</p>

							<div className='flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary-500/5 to-primary-500/5 border border-primary-500/10'>
								{/* Avatar */}
								<div className='relative'>
									<div className='h-14 w-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden'>
										{authenticatedUser.avatarUrl ? (
											<img
												alt={authenticatedUser.displayName}
												className='h-14 w-14 rounded-full object-cover'
												src={authenticatedUser.avatarUrl}
											/>
										) : (
											<span className='text-white font-semibold text-xl'>
												{authenticatedUser.displayName.charAt(0).toUpperCase()}
											</span>
										)}
									</div>
									<div className='absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-background rounded-full' />
								</div>

								{/* User Info */}
								<div className='flex-1 min-w-0'>
									<p className='font-semibold text-text-primary truncate'>
										{authenticatedUser.displayName}
									</p>
									{authenticatedUser.email && (
										<p className='text-sm text-text-secondary truncate'>
											{authenticatedUser.email}
										</p>
									)}
									<p className='text-xs text-primary-400 mt-1'>
										Authenticated Account
									</p>
								</div>
							</div>
						</div>

						{/* Join Button */}
						<Button
							className='w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-200'
							disabled={isJoiningRoom}
							onClick={handleJoinRoom}
						>
							<AnimatePresence mode='wait'>
								{isJoiningRoom ? (
									<motion.div
										animate={{ opacity: 1, scale: 1 }}
										className='flex items-center gap-2'
										exit={{ opacity: 0, scale: 0.8 }}
										initial={{ opacity: 0, scale: 0.8 }}
										key='loading'
									>
										<motion.div
											animate={{ rotate: 360 }}
											className='w-5 h-5 border-2 border-white border-t-transparent rounded-full'
											transition={{
												duration: 1,
												repeat: Infinity,
												ease: 'linear',
											}}
										/>
										<span>Joining...</span>
									</motion.div>
								) : (
									<motion.div
										animate={{ opacity: 1 }}
										className='flex items-center gap-2'
										exit={{ opacity: 0 }}
										initial={{ opacity: 0 }}
										key='default'
									>
										<Users className='h-5 w-5' />
										<span>Join Room</span>
									</motion.div>
								)}
							</AnimatePresence>
						</Button>

						{/* Sign out option */}
						<div className='text-center'>
							<button
								className='inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors'
								onClick={async () => {
									await getSharedSupabaseClient().auth.signOut();
									window.location.reload();
								}}
							>
								<LogOut className='h-3 w-3' />
								Not you? Sign out
							</button>
						</div>
					</div>
				</GlassCard>

				{/* Info */}
				<motion.p
					animate={{ opacity: 1 }}
					className='mt-6 text-center text-xs text-text-tertiary'
					initial={{ opacity: 0 }}
					transition={{ delay: 0.3 }}
				>
					Your activity will be associated with your profile
				</motion.p>
			</JoinPageLayout>
		);
	}

	// Display name input for anonymous users
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
					Join as Guest
				</div>

				<h1 className='text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3'>
					Join <span className='text-primary-400'>Mind Map</span>
				</h1>

				<p className='text-text-secondary text-base'>
					Enter your name to start collaborating
				</p>
			</motion.div>

			<GlassCard>
				<div className='space-y-6'>
					{/* Room Code Display */}
					<div className='flex items-center justify-between p-4 rounded-lg bg-surface-primary/50 border border-border-secondary/50'>
						<span className='text-sm text-text-secondary'>Room Code</span>
						<code className='text-lg font-mono tracking-wider text-primary-400'>
							{token}
						</code>
					</div>

					{/* Display Name Input */}
					<div className='space-y-2'>
						<Label
							className='text-sm font-medium text-text-secondary'
							htmlFor='display_name'
						>
							Your Name
						</Label>

						<Input
							autoComplete='name'
							className='!h-12 !bg-surface-primary/50 !border-border-secondary/50 !text-text-primary !placeholder:text-text-tertiary focus:!border-primary-500/60 focus:!ring-primary-500/20 focus:!ring-2'
							data-testid='display-name-input'
							id='display_name'
							onChange={(e) => setDisplayName(e.target.value)}
							placeholder='How should we call you?'
							value={displayName}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && displayName.trim()) {
									handleJoinRoom();
								}
							}}
						/>

						<p className='text-xs text-text-tertiary'>
							This is how other collaborators will see you
						</p>
					</div>

					{/* Join Button */}
					<Button
						className='w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-200 disabled:opacity-50'
						data-testid='join-room-btn'
						disabled={isJoiningRoom || !displayName.trim()}
						onClick={handleJoinRoom}
					>
						<AnimatePresence mode='wait'>
							{isJoiningRoom ? (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='flex items-center gap-2'
									exit={{ opacity: 0, scale: 0.8 }}
									initial={{ opacity: 0, scale: 0.8 }}
									key='loading'
								>
									<motion.div
										animate={{ rotate: 360 }}
										className='w-5 h-5 border-2 border-white border-t-transparent rounded-full'
										transition={{
											duration: 1,
											repeat: Infinity,
											ease: 'linear',
										}}
									/>
									<span>Joining...</span>
								</motion.div>
							) : (
								<motion.div
									animate={{ opacity: 1 }}
									className='flex items-center gap-2'
									exit={{ opacity: 0 }}
									initial={{ opacity: 0 }}
									key='default'
								>
									<span>Join as Guest</span>
									<ArrowRight className='h-5 w-5' />
								</motion.div>
							)}
						</AnimatePresence>
					</Button>

					{/* Sign in link */}
					<div className='text-center'>
						<button
							className='text-xs text-text-tertiary hover:text-text-secondary transition-colors'
							onClick={() => router.push('/auth/sign-in')}
						>
							Already have an account?{' '}
							<span className='text-primary-400 hover:text-primary-300 underline underline-offset-2'>
								Sign in
							</span>
						</button>
					</div>
				</div>
			</GlassCard>

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
					<span>Instant access</span>
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
					<span>No signup needed</span>
				</div>
			</motion.div>
		</JoinPageLayout>
	);
}
