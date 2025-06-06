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
	CreateGuestUserRequest,
	ShareAccessValidation,
} from '@/types/sharing-types';
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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface JoinRoomPageProps {
	params: {
		token: string;
	};
}

export default function JoinRoomPage({ params }: JoinRoomPageProps) {
	const router = useRouter();
	const {
		validateRoomAccess,
		joinRoom,
		createGuestUser,
		isValidatingAccess,
		isJoiningRoom,
		sharingError,
		setSharingError,
	} = useAppStore();

	const [validation, setValidation] = useState<ShareAccessValidation | null>(
		null
	);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [guestInfo, setGuestInfo] = useState<CreateGuestUserRequest>({
		display_name: '',
		email: '',
		session_id: '',
		fingerprint_hash: '',
	});
	const [isLoading, setIsLoading] = useState(true);
	const [step, setStep] = useState<
		'validating' | 'guest-signup' | 'joining' | 'success' | 'error'
	>('validating');

	useEffect(() => {
		const generateSessionId = () => {
			return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		};

		const checkAuthAndValidate = async () => {
			try {
				// Check if user is authenticated
				const response = await fetch('/api/auth/user');
				const userAuthenticated = response.ok;
				setIsAuthenticated(userAuthenticated);

				// Validate the room token
				const validationResult = await validateRoomAccess(params.token);
				setValidation(validationResult);

				if (validationResult.is_valid) {
					if (userAuthenticated) {
						// Authenticated user can join directly
						await handleJoinRoom();
					} else {
						// Guest user needs to provide info
						setGuestInfo((prev) => ({
							...prev,
							session_id: generateSessionId(),
						}));
						setStep('guest-signup');
					}
				} else {
					setStep('error');
				}
			} catch (error) {
				console.error('Error validating room:', error);
				setStep('error');
			} finally {
				setIsLoading(false);
			}
		};

		if (params.token && params.token.length === 6) {
			checkAuthAndValidate();
		} else {
			setStep('error');
			setIsLoading(false);
		}
	}, [params.token]);

	const handleJoinRoom = async () => {
		if (!validation) return;

		setStep('joining');

		try {
			const result = await joinRoom({
				token: params.token,
				guest_info: !isAuthenticated ? guestInfo : undefined,
			});

			setStep('success');
			toast.success('Successfully joined the room!');

			// Redirect to the mind map
			setTimeout(() => {
				router.push(`/mind-map/${result.mapId}`);
			}, 1500);
		} catch (error) {
			setStep('error');
			toast.error('Failed to join room');
		}
	};

	const handleGuestSignup = async () => {
		if (!guestInfo.display_name.trim()) {
			toast.error('Please enter your name');
			return;
		}

		try {
			await createGuestUser(guestInfo);
			await handleJoinRoom();
		} catch (error) {
			toast.error('Failed to create guest session');
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
							Validating Room Code
						</h2>

						<p className='text-zinc-400'>Checking access permissions...</p>
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

	if (step === 'error' || (validation && !validation.is_valid)) {
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
								{validation?.error_message ||
									sharingError?.message ||
									'Invalid or expired room code'}
							</CardDescription>
						</CardHeader>

						<CardContent className='space-y-4'>
							<Alert className='border-red-900/50 bg-red-950/50'>
								<AlertCircle className='h-4 w-4' />

								<AlertDescription className='text-red-300'>
									Room code: <code className='font-mono'>{params.token}</code>
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
							Welcome to the Room!
						</h2>

						<p className='text-zinc-400'>Redirecting you to the mind map...</p>
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
							Setting up your collaboration session...
						</p>
					</div>
				</motion.div>
			</div>
		);
	}

	// Guest signup step
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
							You&apos;re joining a shared mind map. Enter your details to
							continue.
						</CardDescription>
					</CardHeader>

					<CardContent className='space-y-6'>
						{/* Room Info */}
						{validation && (
							<div className='p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3'>
								<div className='flex items-center justify-between'>
									<span className='text-sm text-zinc-400'>Room Code</span>

									<code className='text-sm font-mono text-teal-400 bg-zinc-900 px-2 py-1 rounded'>
										{params.token}
									</code>
								</div>

								<div className='flex items-center justify-between'>
									<span className='text-sm text-zinc-400'>Your Role</span>

									<Badge variant='outline' className='flex items-center gap-1'>
										{getRoleIcon(validation.permissions.role)}

										{validation.permissions.role}
									</Badge>
								</div>

								<p className='text-xs text-zinc-500'>
									{getRoleDescription(validation.permissions.role)}
								</p>
							</div>
						)}

						<Separator />

						{/* Guest Info Form */}
						<div className='space-y-4'>
							<div className='space-y-2'>
								<Label
									htmlFor='display_name'
									className='text-sm font-medium text-zinc-300'
								>
									Your Name *
								</Label>

								<Input
									id='display_name'
									placeholder='Enter your name'
									value={guestInfo.display_name}
									onChange={(e) =>
										setGuestInfo((prev) => ({
											...prev,
											display_name: e.target.value,
										}))
									}
									className='bg-zinc-800 border-zinc-700'
									autoComplete='name'
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='email'
									className='text-sm font-medium text-zinc-300'
								>
									Email (Optional)
								</Label>

								<Input
									id='email'
									type='email'
									placeholder='your@email.com'
									value={guestInfo.email}
									onChange={(e) =>
										setGuestInfo((prev) => ({ ...prev, email: e.target.value }))
									}
									className='bg-zinc-800 border-zinc-700'
									autoComplete='email'
								/>

								<p className='text-xs text-zinc-500'>
									We&apos;ll use this to convert your session to a full account
									later
								</p>
							</div>
						</div>

						<Button
							onClick={handleGuestSignup}
							disabled={isJoiningRoom || !guestInfo.display_name.trim()}
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
									Join as Guest
								</>
							)}
						</Button>

						{/* Benefits */}
						<div className='text-center space-y-3'>
							<p className='text-xs text-zinc-500'>
								Joining as a guest gives you temporary access. You can upgrade
								to a full account anytime.
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
