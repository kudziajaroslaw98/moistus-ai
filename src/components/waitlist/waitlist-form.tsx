'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { handleApiError, isApiErrorWithStatus, waitlistApi } from '@/lib/api';
import {
	waitlistFormSchema,
	type WaitlistFormData,
} from '@/lib/validations/waitlist';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	AlertCircle,
	ArrowRight,
	CheckCircle,
	Loader2,
	Mail,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { fadeIn, formFieldFocus, successPulse } from './animations';

interface WaitlistFormProps {
	onSuccess?: () => void;
}

const STORAGE_KEY = 'moistus_waitlist_email';

export default function WaitlistForm({ onSuccess }: WaitlistFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [previousEmail, setPreviousEmail] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setError,
	} = useForm<WaitlistFormData>({
		resolver: zodResolver(waitlistFormSchema) as any,
	});

	// Check if user has already signed up
	useEffect(() => {
		const storedEmail = localStorage.getItem(STORAGE_KEY);

		if (storedEmail) {
			setPreviousEmail(storedEmail);
		}
	}, []);

	const onSubmit: SubmitHandler<WaitlistFormData> = async (data) => {
		// Reset states
		setIsSubmitting(true);
		setSubmitError(null);

		// Check if email was already submitted
		if (previousEmail === data.email) {
			setError('email', {
				type: 'manual',
				message: "You're already on the waitlist!",
			});
			setIsSubmitting(false);
			return;
		}

		try {
			// Call the waitlist API
			const result = await waitlistApi.submit(data.email);

			// Success handling
			localStorage.setItem(STORAGE_KEY, data.email);
			setPreviousEmail(data.email);
			setIsSuccess(true);
			reset();

			// Call onSuccess callback if provided
			onSuccess?.();

			// Reset success state after 5 seconds
			setTimeout(() => {
				setIsSuccess(false);
			}, 5000);
		} catch (error) {
			// Handle API errors
			if (isApiErrorWithStatus(error, 409)) {
				// Email already exists - show as form error
				setError('email', {
					type: 'manual',
					message: handleApiError(error),
				});
				setIsSubmitting(false);
				return;
			}

			// Other errors - show as general error
			const errorMessage = handleApiError(error);
			setSubmitError(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className='w-full max-w-md mx-auto'>
			<form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
				<div className='space-y-2'>
					<Label className='sr-only' htmlFor='email'>
						Email address
					</Label>

					<motion.div
						animate='rest'
						className='relative'
						initial='rest'
						variants={formFieldFocus}
						whileFocus='focus'
					>
						<div className='relative'>
							<Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary pointer-events-none' />

							<Input
								{...register('email')}
								aria-describedby={errors.email ? 'email-error' : undefined}
								aria-invalid={!!errors.email}
								aria-label='Email address'
								className='!h-12 !flex pl-12 pr-4 !bg-surface-primary/50 !border-border-secondary/50 !text-text-primary !placeholder:text-text-tertiary focus:!border-primary-500/60 focus:!ring-primary-500/20 focus:!ring-2'
								disabled={isSubmitting || isSuccess}
								id='email'
								placeholder='Enter your email for early access'
								type='email'
							/>
						</div>
					</motion.div>

					{/* Error message */}
					<AnimatePresence mode='wait'>
						{errors.email && (
							<motion.p
								animate='visible'
								className='text-sm text-red-400 flex items-center gap-1'
								exit='hidden'
								id='email-error'
								initial='hidden'
								variants={fadeIn}
							>
								<AlertCircle className='h-3 w-3' />

								{errors.email.message}
							</motion.p>
						)}
					</AnimatePresence>
				</div>

				<Button
					className='w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
					disabled={isSubmitting || isSuccess}
					type='submit'
				>
					<AnimatePresence mode='wait'>
						{isSubmitting ? (
							<motion.div
								animate={{ opacity: 1, scale: 1 }}
								className='flex items-center gap-2 text-white'
								exit={{ opacity: 0, scale: 0.8 }}
								initial={{ opacity: 0, scale: 0.8 }}
								key='loading'
							>
								<Loader2 className='h-5 w-5 animate-spin' />

								<span>Joining waitlist...</span>
							</motion.div>
						) : isSuccess ? (
							<motion.div
								animate='animate'
								className='flex items-center gap-2 text-white'
								initial='initial'
								key='success'
								variants={successPulse}
							>
								<CheckCircle className='h-5 w-5' />

								<span>You&apos;re on the list!</span>
							</motion.div>
						) : (
							<motion.div
								animate={{ opacity: 1 }}
								className='flex items-center gap-2'
								exit={{ opacity: 0 }}
								initial={{ opacity: 0 }}
								key='default'
							>
								<span>Sign up for Early Access</span>

								<ArrowRight className='h-5 w-5' />
							</motion.div>
						)}
					</AnimatePresence>
				</Button>
			</form>

			{/* General error message */}
			<AnimatePresence>
				{submitError && (
					<motion.div
						animate='visible'
						className='mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20'
						exit='hidden'
						initial='hidden'
						variants={fadeIn}
					>
						<p className='text-sm text-red-400 flex items-center gap-2'>
							<AlertCircle className='h-4 w-4 flex-shrink-0' />

							{submitError}
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Already signed up message */}
			<AnimatePresence>
				{previousEmail && !isSuccess && (
					<motion.p
						animate='visible'
						className='mt-4 text-sm text-text-tertiary text-center'
						exit='hidden'
						initial='hidden'
						variants={fadeIn}
					>
						Already signed up with a different email?{' '}

						<button
							className='text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors duration-200'
							type='button'
							onClick={() => {
								localStorage.removeItem(STORAGE_KEY);
								setPreviousEmail(null);
							}}
						>
							Use another email
						</button>
					</motion.p>
				)}
			</AnimatePresence>
		</div>
	);
}
