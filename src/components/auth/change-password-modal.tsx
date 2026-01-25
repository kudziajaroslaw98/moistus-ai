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
import { AlertCircle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
	PasswordRequirementsInfo,
	PasswordStrengthBar,
} from './shared/password-strength';

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

interface ChangePasswordModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({
	open,
	onOpenChange,
}: ChangePasswordModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const shouldReduceMotion = useReducedMotion();

	const {
		register,
		handleSubmit,
		watch,
		reset,
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

	const handleClose = () => {
		if (!isSubmitting) {
			reset();
			setError(null);
			onOpenChange(false);
		}
	};

	const onSubmit = async (data: ResetPasswordFormData) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const supabase = getSharedSupabaseClient();
			const { error: updateError } = await supabase.auth.updateUser({
				password: data.password,
			});

			if (updateError) {
				if (updateError.message.includes('same password')) {
					setError(
						'New password must be different from your current password.'
					);
				} else {
					setError(updateError.message);
				}
				return;
			}

			toast.success('Password updated successfully');
			reset();
			onOpenChange(false);
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
				if (!isOpen) {
					handleClose();
				}
			}}
			dismissible={!isSubmitting}
		>
			<DialogContent
				className='p-0 overflow-hidden border-0 bg-transparent shadow-none max-w-md'
				showCloseButton={false}
			>
				{/* Glassmorphism card matching AuthCard */}
				<motion.div
					className='p-8 rounded-2xl'
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
						border: '1px solid rgba(255, 255, 255, 0.08)',
						backdropFilter: 'blur(12px)',
						WebkitBackdropFilter: 'blur(12px)',
					}}
					initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.3, ease: easeOutQuart }
					}
				>
					<DialogHeader className='text-center mb-6'>
						<DialogTitle className='text-2xl font-bold text-center text-white mb-2'>
							Change Password
						</DialogTitle>
						<DialogDescription className='text-text-secondary text-center'>
							Create a strong password for your account.
						</DialogDescription>
					</DialogHeader>

					<motion.form
						onSubmit={handleSubmit(onSubmit)}
						className='space-y-4'
						initial={
							shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }
						}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.25, delay: 0.1, ease: easeOutQuart }
						}
					>
						{/* New Password */}
						<div>
							<label
								htmlFor='new-password'
								className='flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-2'
							>
								New Password
								<PasswordRequirementsInfo password={password || ''} />
							</label>
							<Input
								id='new-password'
								type='password'
								placeholder='Enter new password'
								disabled={isSubmitting}
								className='h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
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
								htmlFor='confirm-new-password'
								className='block text-sm font-medium text-text-secondary mb-2'
							>
								Confirm Password
							</label>
							<Input
								id='confirm-new-password'
								type='password'
								placeholder='Confirm new password'
								disabled={isSubmitting}
								className='h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
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
									className='flex items-center gap-2 p-3 rounded-lg bg-error-500/10 border border-error-500/20'
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.2 }}
								>
									<AlertCircle className='h-4 w-4 text-error-400 shrink-0' />
									<p className='text-sm text-error-300'>{error}</p>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Submit Button - Full width like forgot-password */}
						<Button
							type='submit'
							disabled={isSubmitting || !isPasswordStrong}
							className='w-full h-12 mt-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
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

						{/* Cancel link styled like forgot-password back link */}
						<div className='text-center mt-4'>
							<button
								type='button'
								onClick={handleClose}
								disabled={isSubmitting}
								className='text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50'
							>
								Cancel
							</button>
						</div>
					</motion.form>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
