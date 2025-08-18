'use client';

import { createClient } from '@/helpers/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Shield, Users, X, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const supabase = createClient();

const UpgradeSchema = z
	.object({
		email: z.string().email('Please enter a valid email address'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
				'Password must contain at least one uppercase letter, one lowercase letter, and one number'
			),
		confirmPassword: z.string(),
		displayName: z
			.string()
			.min(1, 'Display name is required')
			.max(50)
			.optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type UpgradeForm = z.infer<typeof UpgradeSchema>;

interface UpgradeAnonymousPromptProps {
	isAnonymous: boolean;
	userDisplayName?: string;
	onUpgradeSuccess?: () => void;
	onDismiss?: () => void;
	autoShowDelay?: number; // in milliseconds
	className?: string;
}

export function UpgradeAnonymousPrompt({
	isAnonymous,
	userDisplayName,
	onUpgradeSuccess,
	onDismiss,
	autoShowDelay = 5 * 60 * 1000, // 5 minutes
	className = '',
}: UpgradeAnonymousPromptProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [isUpgrading, setIsUpgrading] = useState(false);
	const [upgradeError, setUpgradeError] = useState<string>('');
	const [isDismissed, setIsDismissed] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<UpgradeForm>({
		resolver: zodResolver(UpgradeSchema),
		defaultValues: {
			displayName: userDisplayName || '',
		},
	});

	// Auto-show prompt after delay for anonymous users
	useEffect(() => {
		if (!isAnonymous || isDismissed) return;

		const timer = setTimeout(() => {
			setIsVisible(true);
		}, autoShowDelay);

		return () => clearTimeout(timer);
	}, [isAnonymous, isDismissed, autoShowDelay]);

	// Don't render if user is not anonymous or has been dismissed
	if (!isAnonymous || isDismissed) return null;

	const handleDismiss = () => {
		setIsVisible(false);
		setIsDismissed(true);
		onDismiss?.();
	};

	const onSubmit = async (data: UpgradeForm) => {
		setIsUpgrading(true);
		setUpgradeError('');

		try {
			const response = await fetch('/api/auth/upgrade-anonymous', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: data.email,
					password: data.password,
					display_name: data.displayName,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to upgrade account');
			}

			// Success - close prompt and notify parent
			setIsVisible(false);
			onUpgradeSuccess?.();

			// Show success message briefly
			setTimeout(() => {
				alert('Account upgraded successfully! You can now save your progress.');
			}, 500);
		} catch (error) {
			setUpgradeError(
				error instanceof Error ? error.message : 'Failed to upgrade account'
			);
		} finally {
			setIsUpgrading(false);
		}
	};

	const benefits = [
		{
			icon: Save,
			title: 'Save Progress',
			description: 'Your mind maps will be saved permanently',
		},
		{
			icon: Users,
			title: 'Enhanced Collaboration',
			description: 'Create and manage shared workspaces',
		},
		{
			icon: Zap,
			title: 'Premium Features',
			description: 'Access AI-powered tools and advanced features',
		},
		{
			icon: Shield,
			title: 'Secure Account',
			description: 'Protect your data with a secure account',
		},
	];

	return (
		<AnimatePresence>
			{isVisible && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50'
						onClick={handleDismiss}
					/>

					{/* Modal */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 20 }}
						transition={{ duration: 0.3, ease: 'easeOut' }}
						className={`fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-full md:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 
                       overflow-hidden ${className}`}
					>
						{/* Header */}
						<div className='relative bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white'>
							<button
								onClick={handleDismiss}
								className='absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors'
								disabled={isUpgrading}
							>
								<X className='w-5 h-5' />
							</button>

							<h2 className='text-2xl font-bold mb-2'>Unlock Full Features</h2>

							<p className='text-teal-100'>
								Create a free account to save your progress and access premium
								features
							</p>
						</div>

						<div className='p-6 max-h-[calc(100vh-12rem)] overflow-y-auto'>
							{/* Benefits Grid */}
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
								{benefits.map((benefit, index) => {
									const Icon = benefit.icon;
									return (
										<motion.div
											key={benefit.title}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.1 }}
											className='flex items-start space-x-3 p-3 bg-zinc-800/50 rounded-lg'
										>
											<div className='flex-shrink-0 w-8 h-8 bg-teal-600/20 rounded-lg flex items-center justify-center'>
												<Icon className='w-4 h-4 text-teal-400' />
											</div>

											<div>
												<h3 className='font-medium text-white text-sm'>
													{benefit.title}
												</h3>

												<p className='text-zinc-400 text-xs mt-1'>
													{benefit.description}
												</p>
											</div>
										</motion.div>
									);
								})}
							</div>

							{/* Upgrade Form */}
							<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
								{/* Email */}
								<div>
									<label
										htmlFor='email'
										className='block text-sm font-medium text-zinc-300 mb-2'
									>
										Email Address
									</label>

									<input
										id='email'
										type='email'
										placeholder='your@email.com'
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										{...register('email')}
										disabled={isUpgrading}
									/>

									{errors.email && (
										<p className='mt-1 text-sm text-red-400'>
											{errors.email.message}
										</p>
									)}
								</div>

								{/* Password */}
								<div>
									<label
										htmlFor='password'
										className='block text-sm font-medium text-zinc-300 mb-2'
									>
										Password
									</label>

									<input
										id='password'
										type='password'
										placeholder='Create a secure password'
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										{...register('password')}
										disabled={isUpgrading}
									/>

									{errors.password && (
										<p className='mt-1 text-sm text-red-400'>
											{errors.password.message}
										</p>
									)}
								</div>

								{/* Confirm Password */}
								<div>
									<label
										htmlFor='confirmPassword'
										className='block text-sm font-medium text-zinc-300 mb-2'
									>
										Confirm Password
									</label>

									<input
										id='confirmPassword'
										type='password'
										placeholder='Confirm your password'
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										{...register('confirmPassword')}
										disabled={isUpgrading}
									/>

									{errors.confirmPassword && (
										<p className='mt-1 text-sm text-red-400'>
											{errors.confirmPassword.message}
										</p>
									)}
								</div>

								{/* Display Name (optional) */}
								<div>
									<label
										htmlFor='displayName'
										className='block text-sm font-medium text-zinc-300 mb-2'
									>
										Display Name (optional)
									</label>

									<input
										id='displayName'
										type='text'
										placeholder={userDisplayName || 'Your display name'}
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										{...register('displayName')}
										disabled={isUpgrading}
									/>

									{errors.displayName && (
										<p className='mt-1 text-sm text-red-400'>
											{errors.displayName.message}
										</p>
									)}
								</div>

								{/* Error Display */}
								{upgradeError && (
									<motion.div
										initial={{ opacity: 0, scale: 0.95 }}
										animate={{ opacity: 1, scale: 1 }}
										className='p-3 bg-red-900/50 border border-red-700 rounded-md'
									>
										<p className='text-red-300 text-sm'>{upgradeError}</p>
									</motion.div>
								)}

								{/* Buttons */}
								<div className='flex space-x-3 pt-4'>
									<motion.button
										type='button'
										onClick={handleDismiss}
										disabled={isUpgrading}
										className='flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200'
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
									>
										Maybe Later
									</motion.button>

									<motion.button
										type='submit'
										disabled={isUpgrading}
										className='flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center'
										whileHover={{ scale: isUpgrading ? 1 : 1.02 }}
										whileTap={{ scale: isUpgrading ? 1 : 0.98 }}
									>
										{isUpgrading ? (
											<>
												<motion.div
													className='w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2'
													animate={{ rotate: 360 }}
													transition={{
														duration: 1,
														repeat: Infinity,
														ease: 'linear',
													}}
												/>
												Upgrading...
											</>
										) : (
											'Create Account'
										)}
									</motion.button>
								</div>
							</form>

							{/* Footer */}
							<div className='mt-6 pt-4 border-t border-zinc-800'>
								<p className='text-zinc-500 text-xs text-center'>
									By creating an account, you agree to our Terms of Service and
									Privacy Policy. Your current progress will be preserved.
								</p>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
