'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import {
	checkPasswordStrength,
	resetPasswordSchema,
	type ResetPasswordFormData,
} from '@/lib/validations/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PasswordStrengthBar } from './shared/password-strength';

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

interface PasswordResetModalProps {
	open: boolean;
	onSuccess: () => void;
	onDismiss: () => void;
}

export function PasswordResetModal({
	open,
	onSuccess,
	onDismiss,
}: PasswordResetModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
	});

	const password = watch('password');
	const { isValid: isPasswordStrong } = checkPasswordStrength(password || '');

	const onSubmit = async (data: ResetPasswordFormData) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const supabase = getSharedSupabaseClient();
			const { error: updateError } = await supabase.auth.updateUser({
				password: data.password,
			});

			if (updateError) {
				// Handle specific error cases
				if (updateError.message.includes('expired')) {
					setError(
						'Your password reset link has expired. Please request a new one.'
					);
				} else if (updateError.message.includes('same password')) {
					setError(
						'New password must be different from your current password.'
					);
				} else {
					setError(updateError.message);
				}
				return;
			}

			setSuccess(true);

			// Brief delay to show success state before redirecting
			setTimeout(() => {
				onSuccess();
				router.push('/dashboard');
				router.refresh();
			}, 1500);
		} catch {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen && !isSubmitting && !success) {
					onDismiss();
				}
			}}
			dismissible={!isSubmitting && !success}
		>
			<DialogContent
				className='p-0 overflow-hidden bg-zinc-900 border-zinc-700'
				showCloseButton={!isSubmitting && !success}
			>
				{/* Header with gradient */}
				<div className='relative px-6 pt-6 pb-4 bg-gradient-to-b from-primary-500/10 to-transparent'>
					<motion.div
						className='mx-auto w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center mb-4'
						initial={shouldReduceMotion ? { scale: 1 } : { scale: 0.8 }}
						animate={{ scale: 1 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.3, ease: easeOutQuart }
						}
					>
						<KeyRound className='w-6 h-6 text-primary-400' />
					</motion.div>

					<DialogHeader className='text-center'>
						<DialogTitle className='text-xl font-semibold text-white'>
							{success ? 'Password Updated!' : 'Set New Password'}
						</DialogTitle>
						<DialogDescription className='text-zinc-400 mt-1'>
							{success
								? 'Your password has been successfully updated.'
								: 'Create a strong password to secure your account.'}
						</DialogDescription>
					</DialogHeader>
				</div>

				{/* Content */}
				<div className='px-6 pb-6'>
					<AnimatePresence mode='wait'>
						{success ? (
							<motion.div
								key='success'
								className='flex flex-col items-center py-4'
								initial={
									shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
								}
								animate={{ opacity: 1, y: 0 }}
								transition={
									shouldReduceMotion
										? { duration: 0 }
										: { duration: 0.25, ease: easeOutQuart }
								}
							>
								<div className='w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4'>
									<CheckCircle2 className='w-8 h-8 text-emerald-400' />
								</div>
								<p className='text-sm text-zinc-400 text-center'>
									Redirecting to your dashboard...
								</p>
							</motion.div>
						) : (
							<motion.form
								key='form'
								onSubmit={handleSubmit(onSubmit)}
								className='space-y-4'
								initial={
									shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
								}
								animate={{ opacity: 1, y: 0 }}
								transition={
									shouldReduceMotion
										? { duration: 0 }
										: { duration: 0.25, ease: easeOutQuart }
								}
							>
								{/* New Password */}
								<div>
									<label
										htmlFor='password'
										className='block text-sm font-medium text-zinc-300 mb-2'
									>
										New Password
									</label>
									<Input
										id='password'
										type='password'
										placeholder='Enter new password'
										disabled={isSubmitting}
										className='h-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-primary-500/50 focus:ring-primary-500/20'
										{...register('password')}
									/>
									{errors.password && (
										<p className='mt-1 text-sm text-error-400'>
											{errors.password.message}
										</p>
									)}
									<PasswordStrengthBar password={password || ''} />
								</div>

								{/* Confirm Password */}
								<div>
									<label
										htmlFor='confirmPassword'
										className='block text-sm font-medium text-zinc-300 mb-2'
									>
										Confirm Password
									</label>
									<Input
										id='confirmPassword'
										type='password'
										placeholder='Confirm new password'
										disabled={isSubmitting}
										className='h-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-primary-500/50 focus:ring-primary-500/20'
										{...register('confirmPassword')}
									/>
									{errors.confirmPassword && (
										<p className='mt-1 text-sm text-error-400'>
											{errors.confirmPassword.message}
										</p>
									)}
								</div>

								{/* Error message */}
								<AnimatePresence>
									{error && (
										<motion.div
											className='flex items-start gap-2 p-3 rounded-lg bg-error-500/10 border border-error-500/20'
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											transition={{ duration: 0.2 }}
										>
											<AlertCircle className='h-4 w-4 text-error-400 shrink-0 mt-0.5' />
											<p className='text-sm text-error-300'>{error}</p>
										</motion.div>
									)}
								</AnimatePresence>

								{/* Submit button */}
								<Button
									type='submit'
									disabled={isSubmitting || !isPasswordStrong}
									className='w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
								>
									{isSubmitting ? (
										<>
											<Loader2 className='h-5 w-5 animate-spin mr-2' />
											Updating Password...
										</>
									) : (
										'Update Password'
									)}
								</Button>
							</motion.form>
						)}
					</AnimatePresence>
				</div>
			</DialogContent>
		</Dialog>
	);
}
