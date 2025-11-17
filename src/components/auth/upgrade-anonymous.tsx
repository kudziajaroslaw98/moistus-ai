'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Shield, Users, X, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Resolver } from 'react-hook-form';
import { z } from 'zod';

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
	} = useForm<UpgradeForm>({
		resolver: zodResolver(UpgradeSchema) as any,
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

	const onSubmit: SubmitHandler<UpgradeForm> = async (data) => {
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
						animate={{ opacity: 1 }}
						className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50'
						exit={{ opacity: 0 }}
						initial={{ opacity: 0 }}
						onClick={handleDismiss}
					/>

					{/* Modal */}
					<motion.div
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 20 }}
						initial={{ opacity: 0, scale: 0.9, y: 20 }}
						transition={{ duration: 0.3, ease: 'easeOut' as const }}
						className={`fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-full md:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 
                       overflow-hidden ${className}`}
					>
						{/* Header */}
						<div className='relative bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white'>
							<button
								className='absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors'
								disabled={isUpgrading}
								onClick={handleDismiss}
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
											animate={{ opacity: 1, y: 0 }}
											className='flex items-start space-x-3 p-3 bg-zinc-800/50 rounded-lg'
											initial={{ opacity: 0, y: 10 }}
											key={benefit.title}
											transition={{ delay: index * 0.1 }}
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
							<form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
								{/* Email */}
								<div>
									<label
										className='block text-sm font-medium text-zinc-300 mb-2'
										htmlFor='email'
									>
										Email Address
									</label>

									<input
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										id='email'
										placeholder='your@email.com'
										type='email'
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
										className='block text-sm font-medium text-zinc-300 mb-2'
										htmlFor='password'
									>
										Password
									</label>

									<input
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										id='password'
										placeholder='Create a secure password'
										type='password'
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
										className='block text-sm font-medium text-zinc-300 mb-2'
										htmlFor='confirmPassword'
									>
										Confirm Password
									</label>

									<input
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										id='confirmPassword'
										placeholder='Confirm your password'
										type='password'
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
										className='block text-sm font-medium text-zinc-300 mb-2'
										htmlFor='displayName'
									>
										Display Name (optional)
									</label>

									<input
										className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
										id='displayName'
										placeholder={userDisplayName || 'Your display name'}
										type='text'
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
										animate={{ opacity: 1, scale: 1 }}
										className='p-3 bg-red-900/50 border border-red-700 rounded-md'
										initial={{ opacity: 0, scale: 0.95 }}
									>
										<p className='text-red-300 text-sm'>{upgradeError}</p>
									</motion.div>
								)}

								{/* Buttons */}
								<div className='flex space-x-3 pt-4'>
									<motion.button
										className='flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200'
										disabled={isUpgrading}
										onClick={handleDismiss}
										type='button'
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
									>
										Maybe Later
									</motion.button>

									<motion.button
										className='flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center'
										disabled={isUpgrading}
										type='submit'
										whileHover={{ scale: isUpgrading ? 1 : 1.02 }}
										whileTap={{ scale: isUpgrading ? 1 : 0.98 }}
									>
										{isUpgrading ? (
											<>
												<motion.div
													animate={{ rotate: 360 }}
													className='w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2'
													transition={{
														duration: 1,
														repeat: Infinity,
														ease: 'linear' as const,
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
