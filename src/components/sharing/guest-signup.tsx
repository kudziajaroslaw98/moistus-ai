'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { GuestUser } from '@/types/sharing-types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	ArrowRight,
	Brain,
	CreditCard,
	Mail,
	Shield,
	Sparkles,
	User,
	Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const guestSignupSchema = z.object({
	display_name: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.max(50, 'Name must be less than 50 characters')
		.regex(
			/^[a-zA-Z0-9\s_-]+$/,
			'Name can only contain letters, numbers, spaces, hyphens, and underscores'
		)
		.refine(
			(name) => !containsProfanity(name),
			'Please choose an appropriate name'
		),
	email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

type GuestSignupFormData = z.infer<typeof guestSignupSchema>;

interface GuestSignupProps {
	onGuestCreated?: (guest: GuestUser) => void;
	onConversion?: (userId: string) => void;
	suggestedName?: string;
	mapTitle?: string;
	className?: string;
}

// Simple profanity check (you can expand this list)
const profanityList = ['badword1', 'badword2']; // Replace with actual list

function containsProfanity(text: string): boolean {
	const lowerText = text.toLowerCase();
	return profanityList.some((word) => lowerText.includes(word));
}

// Generate a fingerprint hash for the user
async function generateFingerprint(): Promise<string> {
	try {
		// Collect browser fingerprint data
		const fingerprintData = {
			userAgent: navigator.userAgent,
			language: navigator.language,
			platform: navigator.platform,
			screenResolution: `${screen.width}x${screen.height}`,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			hardwareConcurrency: navigator.hardwareConcurrency,
			cookieEnabled: navigator.cookieEnabled,
			timestamp: Date.now(),
		};

		// Convert to string and hash
		const dataString = JSON.stringify(fingerprintData);
		const encoder = new TextEncoder();
		const data = encoder.encode(dataString);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		return hashHex;
	} catch (error) {
		// Fallback to a random ID if fingerprinting fails
		return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

// Generate avatar based on name
function getAvatarUrl(name: string): string {
	return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a&textColor=5eead4`;
}

export function GuestSignup({
	onGuestCreated,
	onConversion,
	suggestedName = '',
	mapTitle,
	className,
}: GuestSignupProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [sessionId] = useState(
		() => `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	);
	const [fingerprint, setFingerprint] = useState<string>('');
	const [showBenefits, setShowBenefits] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
	} = useForm<GuestSignupFormData>({
		resolver: zodResolver(guestSignupSchema),
		defaultValues: {
			display_name: suggestedName,
			email: '',
		},
	});

	const watchedName = watch('display_name');

	// Generate fingerprint on mount
	useEffect(() => {
		generateFingerprint().then(setFingerprint);
	}, []);

	// Set suggested name if provided
	useEffect(() => {
		if (suggestedName) {
			setValue('display_name', suggestedName);
		}
	}, [suggestedName, setValue]);

	const handleGuestSignup = async (data: GuestSignupFormData) => {
		setIsCreating(true);

		try {
			const response = await fetch('/api/share/create-guest-user', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					display_name: data.display_name,
					email: data.email || undefined,
					session_id: sessionId,
					fingerprint_hash: fingerprint,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to create guest user');
			}

			const guestUser: GuestUser = await response.json();

			toast.success('Welcome! You can now collaborate.');
			onGuestCreated?.(guestUser);
		} catch (error) {
			console.error('Error creating guest user:', error);
			toast.error('Failed to create guest session. Please try again.');
		} finally {
			setIsCreating(false);
		}
	};

	const handleCreateAccount = () => {
		// Store current guest info for conversion
		if (typeof window !== 'undefined') {
			localStorage.setItem(
				'guestConversionData',
				JSON.stringify({
					display_name: watchedName,
					email: watch('email'),
					session_id: sessionId,
				})
			);
		}

		// Redirect to signup
		window.location.href = '/auth/signup?from=guest';
	};

	const benefits = [
		{ icon: Brain, text: 'Save your mind maps permanently' },
		{ icon: Users, text: 'Collaborate with unlimited users' },
		{ icon: Shield, text: 'Advanced privacy controls' },
		{ icon: CreditCard, text: 'Access premium features' },
	];

	return (
		<Card className={`border-zinc-800 bg-zinc-900 ${className}`}>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div className='space-y-1'>
						<CardTitle className='text-xl'>Join as Guest</CardTitle>

						<CardDescription>
							{mapTitle
								? `You're joining "${mapTitle}"`
								: 'Quick access to collaborate'}
						</CardDescription>
					</div>

					<Badge variant='secondary' className='bg-zinc-800'>
						<Users className='w-3 h-3 mr-1' />
						Guest Access
					</Badge>
				</div>
			</CardHeader>

			<CardContent className='space-y-6'>
				<form onSubmit={handleSubmit(handleGuestSignup)} className='space-y-4'>
					{/* Name Input with Avatar Preview */}
					<div className='space-y-2'>
						<Label htmlFor='display_name'>Your Name</Label>

						<div className='flex items-center gap-3'>
							<Avatar className='h-10 w-10 border border-zinc-700'>
								<AvatarImage
									src={watchedName ? getAvatarUrl(watchedName) : undefined}
									alt={watchedName || 'Guest'}
								/>

								<AvatarFallback className='bg-zinc-800 text-zinc-400'>
									<User className='h-5 w-5' />
								</AvatarFallback>
							</Avatar>

							<div className='flex-1'>
								<Input
									id='display_name'
									{...register('display_name')}
									placeholder='Enter your name'
									className='bg-zinc-800 border-zinc-700'
									autoComplete='name'
									autoFocus
								/>

								{errors.display_name && (
									<p className='text-xs text-red-400 mt-1'>
										{errors.display_name.message}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Email Input */}
					<div className='space-y-2'>
						<Label
							htmlFor='email'
							className='flex items-center justify-between'
						>
							<span>Email (Optional)</span>

							<span className='text-xs text-zinc-500 font-normal'>
								For account conversion
							</span>
						</Label>

						<div className='relative'>
							<Mail className='absolute left-3 top-2.5 h-4 w-4 text-zinc-500' />

							<Input
								id='email'
								{...register('email')}
								type='email'
								placeholder='your@email.com'
								className='bg-zinc-800 border-zinc-700 pl-10'
								autoComplete='email'
							/>
						</div>

						{errors.email && (
							<p className='text-xs text-red-400 mt-1'>
								{errors.email.message}
							</p>
						)}
					</div>

					{/* Privacy Notice */}
					<Alert className='border-zinc-700 bg-zinc-800/50'>
						<Shield className='h-4 w-4' />

						<AlertDescription className='text-xs'>
							Your session is temporary and anonymous. We only store your
							display name and optional email for this collaboration session.
						</AlertDescription>
					</Alert>

					{/* Action Buttons */}
					<div className='space-y-3'>
						<Button type='submit' className='w-full' disabled={isCreating}>
							{isCreating ? (
								<motion.div
									className='flex items-center gap-2'
									animate={{ opacity: [0.5, 1, 0.5] }}
									transition={{ duration: 1.5, repeat: Infinity }}
								>
									<div className='h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
									Creating session...
								</motion.div>
							) : (
								<>
									Continue as Guest
									<ArrowRight className='ml-2 h-4 w-4' />
								</>
							)}
						</Button>

						<Button
							type='button'
							variant='outline'
							className='w-full border-zinc-700'
							onClick={handleCreateAccount}
						>
							<Sparkles className='mr-2 h-4 w-4 text-yellow-500' />
							Create Free Account Instead
						</Button>
					</div>
				</form>

				<Separator className='bg-zinc-800' />

				{/* Benefits Section */}
				<div className='space-y-3'>
					<button
						type='button'
						onClick={() => setShowBenefits(!showBenefits)}
						className='flex items-center justify-between w-full text-sm text-zinc-400 hover:text-zinc-300 transition-colors'
					>
						<span>Why create an account?</span>

						<motion.div
							animate={{ rotate: showBenefits ? 180 : 0 }}
							transition={{ duration: 0.2 }}
						>
							<ArrowRight className='h-4 w-4 rotate-90' />
						</motion.div>
					</button>

					<AnimatePresence>
						{showBenefits && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.2 }}
								className='space-y-2 overflow-hidden'
							>
								{benefits.map((benefit, index) => (
									<motion.div
										key={index}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.1 }}
										className='flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30'
									>
										<benefit.icon className='h-4 w-4 text-teal-400 flex-shrink-0' />

										<span className='text-xs text-zinc-300'>
											{benefit.text}
										</span>
									</motion.div>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Session Info */}
				<div className='text-center'>
					<p className='text-xs text-zinc-500'>
						Session ID: <code className='font-mono'>{sessionId.slice(-8)}</code>
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
