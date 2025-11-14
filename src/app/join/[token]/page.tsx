'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import useAppStore from '@/store/mind-map-store';
import type { JoinRoomResult } from '@/store/slices/sharing-slice';
import {
	AlertCircle,
	Brain,
	CheckCircle,
	RefreshCw,
	Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

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
				// Clear any previous errors
				clearError();

				// 1. Validate token format
				const upperToken = token?.toUpperCase();

				if (!upperToken || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i.test(upperToken)) {
					setStep('error');
					return;
				}

				// 2. Check if user is already authenticated
				const supabase = getSharedSupabaseClient();
				const {
					data: { session },
					error: sessionError,
				} = await supabase.auth.getSession();

				if (sessionError) {
					console.warn('Session check failed:', sessionError);
				}

				// 3. If session exists, get user profile
				if (session?.user) {
					const { data: profile, error: profileError } = await supabase
						.from('user_profiles')
						.select('user_id, display_name, email, avatar_url, is_anonymous')
						.eq('user_id', session.user.id)
						.single();

					if (profileError) {
						console.warn('Profile fetch failed:', profileError);
					}

					// 4. Check if this is a real (non-anonymous) user
					if (profile && !profile.is_anonymous) {
						console.log('Authenticated user detected:', profile.display_name);

						setAuthenticatedUser({
							userId: profile.user_id,
							displayName: profile.display_name || profile.email || 'User',
							email: profile.email || undefined,
							avatarUrl: profile.avatar_url || undefined,
							isAnonymous: false,
						});

						// Show confirmation screen for authenticated users
						setStep('confirm-join');
						setIsLoading(false);
						return;
					}
				}

				// 5. No authenticated user - show anonymous join form
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
		// If authenticated user, skip display name check
		if (authenticatedUser && !authenticatedUser.isAnonymous) {
			setStep('joining');

			try {
				// Use existing authenticated user
				const result = await joinRoom(token.toUpperCase());
				setJoinResult(result);
				setStep('success');

				toast.success(`Joined as ${authenticatedUser.displayName}!`);

				// Redirect to the mind map
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

		// Anonymous user flow (existing logic)
		if (!displayName.trim()) {
			toast.error('Please enter your name');
			return;
		}

		setStep('joining');

		try {
			// Ensure user is authenticated (anonymous sign-in happens automatically)
			const isAuthenticated = await ensureAuthenticated(displayName.trim());

			if (!isAuthenticated) {
				throw new Error('Failed to authenticate');
			}

			// Join the room with the token
			const result = await joinRoom(token.toUpperCase(), displayName.trim());
			setJoinResult(result);
			setStep('success');

			toast.success('Successfully joined the room!');

			// Redirect to the mind map
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

	if (isLoading || step === 'validating') {
		return (
			<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-4'
					initial={{ opacity: 0, scale: 0.9 }}
				>
					<div className='relative'>
						<Brain className='h-12 w-12 text-teal-400 mx-auto animate-pulse' />

						<div className='absolute inset-0 bg-teal-400/20 rounded-full animate-ping' />
					</div>

					<div className='space-y-2'>
						<h2 className='text-xl font-semibold text-zinc-100'>
							Preparing Room Access
						</h2>

						<p className='text-zinc-400'>Validating room code...</p>
					</div>

					<div className='flex items-center justify-center gap-1'>
						{[0, 1, 2].map((i) => (
							<motion.div
								className='w-2 h-2 bg-teal-400 rounded-full'
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
				</motion.div>
			</div>
		);
	}

	if (step === 'error' || sharingError) {
		return (
			<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='w-full max-w-md'
					initial={{ opacity: 0, y: 20 }}
				>
					<Card className='border-red-900/50 bg-zinc-900'>
						<CardHeader className='text-center'>
							<AlertCircle className='h-12 w-12 text-red-400 mx-auto mb-4' />

							<CardTitle className='text-red-400'>
								Unable to Join Room
							</CardTitle>

							<CardDescription>
								{sharingError?.message || 'Invalid or expired room code'}
							</CardDescription>
						</CardHeader>

						<CardContent className='space-y-4'>
							<Alert className='border-red-900/50 bg-red-950/50'>
								<AlertCircle className='h-4 w-4' />

								<AlertDescription className='text-red-300'>
									Room code: <code className='font-mono'>{token}</code>
								</AlertDescription>
							</Alert>

							<div className='space-y-2'>
								<Button
									className='w-full'
									onClick={() => router.push('/dashboard')}
									variant='outline'
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
						</CardContent>
					</Card>
				</motion.div>
			</div>
		);
	}

	if (step === 'success') {
		return (
			<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-6'
					initial={{ opacity: 0, scale: 0.9 }}
				>
					<motion.div
						animate={{ scale: 1 }}
						className='relative'
						initial={{ scale: 0 }}
						transition={{ delay: 0.2 }}
					>
						<CheckCircle className='h-16 w-16 text-green-400 mx-auto' />

						<motion.div
							animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
							className='absolute inset-0 bg-green-400/20 rounded-full'
							transition={{ duration: 2, repeat: Infinity }}
						/>
					</motion.div>

					<div className='space-y-2'>
						<h2 className='text-2xl font-bold text-zinc-100'>
							Welcome
							{authenticatedUser ? `, ${authenticatedUser.displayName}` : ''}!
						</h2>

						<p className='text-zinc-400'>
							Redirecting you to the collaboration...
						</p>
					</div>

					<div className='flex items-center justify-center gap-1'>
						{[0, 1, 2].map((i) => (
							<motion.div
								className='w-2 h-2 bg-green-400 rounded-full'
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
				</motion.div>
			</div>
		);
	}

	if (step === 'joining') {
		return (
			<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-4'
					initial={{ opacity: 0, scale: 0.9 }}
				>
					<RefreshCw className='h-12 w-12 text-teal-400 mx-auto animate-spin' />

					<div className='space-y-2'>
						<h2 className='text-xl font-semibold text-zinc-100'>
							Joining Room
						</h2>

						<p className='text-zinc-400'>
							{authenticatedUser
								? 'Connecting with your account...'
								: 'Setting up your anonymous session...'}
						</p>
					</div>
				</motion.div>
			</div>
		);
	}

	// Confirmation screen for authenticated users
	if (step === 'confirm-join' && authenticatedUser) {
		return (
			<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='w-full max-w-md'
					initial={{ opacity: 0, y: 20 }}
				>
					<Card className='border-zinc-800 bg-zinc-900'>
						<CardHeader className='text-center'>
							<Brain className='h-10 w-10 text-teal-400 mx-auto mb-4' />

							<CardTitle className='text-zinc-100'>
								Join Collaboration Room
							</CardTitle>

							<CardDescription>
								You&apos;re about to join a shared mind map with your account.
							</CardDescription>
						</CardHeader>

						<CardContent className='space-y-6'>
							{/* Room Info */}
							<div className='p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3'>
								<div className='flex items-center justify-between'>
									<span className='text-sm text-zinc-400'>Room Code</span>

									<code className='text-sm font-mono text-teal-400 bg-zinc-900 px-2 py-1 rounded'>
										{token}
									</code>
								</div>
							</div>

							<Separator />

							{/* User Account Info */}
							<div className='space-y-4'>
								<div className='text-sm font-medium text-zinc-300'>
									Joining as:
								</div>

								<div className='flex items-center gap-4 p-4 rounded-lg border border-teal-700/50 bg-teal-950/20'>
									{/* Avatar */}
									<div className='relative'>
										<div className='h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center'>
											{authenticatedUser.avatarUrl ? (
												<img
													alt={authenticatedUser.displayName}
													className='h-12 w-12 rounded-full object-cover'
													src={authenticatedUser.avatarUrl}
												/>
											) : (
												<span className='text-white font-semibold text-lg'>
													{authenticatedUser.displayName
														.charAt(0)
														.toUpperCase()}
												</span>
											)}
										</div>
										
										<div className='absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-zinc-900 rounded-full' />
									</div>

									{/* User Info */}
									<div className='flex-1 min-w-0'>
										<div className='text-sm font-semibold text-zinc-100 truncate'>
											{authenticatedUser.displayName}
										</div>
										
										{authenticatedUser.email && (
											<div className='text-xs text-zinc-400 truncate'>
												{authenticatedUser.email}
											</div>
										)}
										
										<div className='text-xs text-teal-400 mt-1'>
											Authenticated Account
										</div>
									</div>
								</div>

								<p className='text-xs text-zinc-500'>
									You&apos;ll join with full access to your account features.
									All activity will be associated with your profile.
								</p>
							</div>

							<Button
								className='w-full bg-teal-600 hover:bg-teal-700'
								disabled={isJoiningRoom}
								onClick={handleJoinRoom}
							>
								{isJoiningRoom ? (
									<>
										<RefreshCw className='mr-2 h-4 w-4 animate-spin' />
										Joining...
									</>
								) : (
									<>
										<Users className='mr-2 h-4 w-4' />
										Join Room
									</>
								)}
							</Button>

							{/* Sign out option */}
							<div className='text-center'>
								<Button
									className='text-xs'
									size='sm'
									variant='ghost'
									onClick={async () => {
										await getSharedSupabaseClient().auth.signOut();
										window.location.reload();
									}}
								>
									Not you? Sign out
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		);
	}

	// Display name input step
	return (
		<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='w-full max-w-md'
				initial={{ opacity: 0, y: 20 }}
			>
				<Card className='border-zinc-800 bg-zinc-900'>
					<CardHeader className='text-center'>
						<Brain className='h-10 w-10 text-teal-400 mx-auto mb-4' />

						<CardTitle className='text-zinc-100'>
							Join Collaboration Room
						</CardTitle>

						<CardDescription>
							You&apos;re joining a shared mind map. Enter your name to continue
							as an anonymous user.
						</CardDescription>
					</CardHeader>

					<CardContent className='space-y-6'>
						{/* Room Info */}
						<div className='p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3'>
							<div className='flex items-center justify-between'>
								<span className='text-sm text-zinc-400'>Room Code</span>

								<code className='text-sm font-mono text-teal-400 bg-zinc-900 px-2 py-1 rounded'>
									{token}
								</code>
							</div>

							<p className='text-xs text-zinc-500'>
								You&apos;ll join with anonymous access. You can upgrade to a
								full account anytime.
							</p>
						</div>

						<Separator />

						{/* Display Name Form */}
						<div className='space-y-4'>
							<div className='space-y-2'>
								<Label
									className='text-sm font-medium text-zinc-300'
									htmlFor='display_name'
								>
									Your Display Name
								</Label>

								<Input
									autoComplete='name'
									className='bg-zinc-800 border-zinc-700'
									id='display_name'
									onChange={(e) => setDisplayName(e.target.value)}
									placeholder='Enter your name'
									value={displayName}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && displayName.trim()) {
											handleJoinRoom();
										}
									}}
								/>

								<p className='text-xs text-zinc-500'>
									This is how other collaborators will see you
								</p>
							</div>
						</div>

						<Button
							className='w-full'
							disabled={isJoiningRoom || !displayName.trim()}
							onClick={handleJoinRoom}
						>
							{isJoiningRoom ? (
								<>
									<RefreshCw className='mr-2 h-4 w-4 animate-spin' />
									Joining...
								</>
							) : (
								<>
									<Users className='mr-2 h-4 w-4' />
									Join Anonymously
								</>
							)}
						</Button>

						{/* Benefits */}
						<div className='text-center space-y-3'>
							<p className='text-xs text-zinc-500'>
								Anonymous access gives you instant collaboration. You can create
								a full account later to save your work.
							</p>

							<Button
								className='text-xs'
								onClick={() => router.push('/auth/signin')}
								size='sm'
								variant='ghost'
							>
								Already have an account? Sign in
							</Button>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
