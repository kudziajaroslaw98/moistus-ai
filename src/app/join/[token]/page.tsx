'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import useAppStore from '@/contexts/mind-map/mind-map-store';
import {
	AlertCircle,
	Brain,
	CheckCircle,
	Edit,
	Eye,
	MessageSquare,
	RefreshCw,
	Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { toast } from 'sonner';

interface JoinRoomPageProps {
	params: Promise<{
		token: string;
	}>;
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
		'validating' | 'display-name' | 'joining' | 'success' | 'error'
	>('validating');
	const [joinResult, setJoinResult] = useState<any>(null);

	useEffect(() => {
		const validateTokenAndPrepare = async () => {
			try {
				// Clear any previous errors
				clearError();

				// Validate token format
				const upperToken = token?.toUpperCase();
				if (!upperToken || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i.test(upperToken)) {
					setStep('error');
					return;
				}

				// Generate a default display name
				const defaultName = `User ${Date.now().toString().slice(-4)}`;
				setDisplayName(defaultName);

				// Move to display name step
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

	const getRoleIcon = (role: string) => {
		switch (role) {
			case 'editor':
				return <Edit className='h-4 w-4' />;
			case 'commenter':
				return <MessageSquare className='h-4 w-4' />;
			default:
				return <Eye className='h-4 w-4' />;
		}
	};

	const getRoleDescription = (role: string) => {
		switch (role) {
			case 'editor':
				return 'You can view, edit, and modify the mind map';
			case 'commenter':
				return 'You can view the mind map and add comments';
			default:
				return 'You can view the mind map';
		}
	};

	if (isLoading || step === 'validating') {
		return (
			<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-4'
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
								key={i}
								className='w-2 h-2 bg-teal-400 rounded-full'
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
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className='w-full max-w-md'
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
									onClick={() => router.push('/dashboard')}
									className='w-full'
									variant='outline'
								>
									Go to Dashboard
								</Button>
								<Button
									onClick={() => window.location.reload()}
									variant='ghost'
									className='w-full'
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
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-6'
				>
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2 }}
						className='relative'
					>
						<CheckCircle className='h-16 w-16 text-green-400 mx-auto' />
						<motion.div
							className='absolute inset-0 bg-green-400/20 rounded-full'
							animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
							transition={{ duration: 2, repeat: Infinity }}
						/>
					</motion.div>

					<div className='space-y-2'>
						<h2 className='text-2xl font-bold text-zinc-100'>
							Welcome to {joinResult?.map_title || 'the Mind Map'}!
						</h2>
						<p className='text-zinc-400'>Redirecting you to the collaboration...</p>
					</div>

					<div className='flex items-center justify-center gap-1'>
						{[0, 1, 2].map((i) => (
							<motion.div
								key={i}
								className='w-2 h-2 bg-green-400 rounded-full'
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
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					className='text-center space-y-4'
				>
					<RefreshCw className='h-12 w-12 text-teal-400 mx-auto animate-spin' />
					<div className='space-y-2'>
						<h2 className='text-xl font-semibold text-zinc-100'>
							Joining Room
						</h2>
						<p className='text-zinc-400'>
							Setting up your anonymous session...
						</p>
					</div>
				</motion.div>
			</div>
		);
	}

	// Display name input step
	return (
		<div className='min-h-screen bg-zinc-950 flex items-center justify-center p-4'>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className='w-full max-w-md'
			>
				<Card className='border-zinc-800 bg-zinc-900'>
					<CardHeader className='text-center'>
						<Brain className='h-10 w-10 text-teal-400 mx-auto mb-4' />
						<CardTitle className='text-zinc-100'>
							Join Collaboration Room
						</CardTitle>
						<CardDescription>
							You&apos;re joining a shared mind map. Enter your name to continue as an anonymous user.
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
								You&apos;ll join with anonymous access. You can upgrade to a full account anytime.
							</p>
						</div>

						<Separator />

						{/* Display Name Form */}
						<div className='space-y-4'>
							<div className='space-y-2'>
								<Label
									htmlFor='display_name'
									className='text-sm font-medium text-zinc-300'
								>
									Your Display Name
								</Label>
								<Input
									id='display_name'
									placeholder='Enter your name'
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									className='bg-zinc-800 border-zinc-700'
									autoComplete='name'
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
							onClick={handleJoinRoom}
							disabled={isJoiningRoom || !displayName.trim()}
							className='w-full'
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
								Anonymous access gives you instant collaboration. You can create a full account later to save your work.
							</p>
							<Button
								variant='ghost'
								size='sm'
								onClick={() => router.push('/auth/signin')}
								className='text-xs'
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