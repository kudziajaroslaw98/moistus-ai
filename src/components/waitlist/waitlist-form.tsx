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
import { useForm } from 'react-hook-form';
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
		resolver: zodResolver(waitlistFormSchema),
	});

	// Check if user has already signed up
	useEffect(() => {
		const storedEmail = localStorage.getItem(STORAGE_KEY);

		if (storedEmail) {
			setPreviousEmail(storedEmail);
		}
	}, []);

	const onSubmit = async (data: WaitlistFormData) => {
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
			<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
				<div className='space-y-2'>
					<Label htmlFor='email' className='sr-only'>
						Email address
					</Label>

					<motion.div
						variants={formFieldFocus}
						initial='rest'
						whileFocus='focus'
						animate='rest'
						className='relative'
					>
						<div className='relative'>
							<Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 pointer-events-none' />

							<Input
								{...register('email')}
								id='email'
								type='email'
								placeholder='Enter your email for early access'
								className='!h-12 !flex pl-12 pr-4 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/50 focus:ring-violet-500/20'
								disabled={isSubmitting || isSuccess}
								aria-label='Email address'
								aria-invalid={!!errors.email}
								aria-describedby={errors.email ? 'email-error' : undefined}
							/>
						</div>
					</motion.div>

					{/* Error message */}
					<AnimatePresence mode='wait'>
						{errors.email && (
							<motion.p
								id='email-error'
								variants={fadeIn}
								initial='hidden'
								animate='visible'
								exit='hidden'
								className='text-sm text-red-400 flex items-center gap-1'
							>
								<AlertCircle className='h-3 w-3' />

								{errors.email.message}
							</motion.p>
						)}
					</AnimatePresence>
				</div>

				<Button
					type='submit'
					disabled={isSubmitting || isSuccess}
					className='w-full h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
				>
					<AnimatePresence mode='wait'>
						{isSubmitting ? (
							<motion.div
								key='loading'
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								className='flex items-center gap-2 text-white'
							>
								<Loader2 className='h-5 w-5 animate-spin' />

								<span>Joining waitlist...</span>
							</motion.div>
						) : isSuccess ? (
							<motion.div
								key='success'
								variants={successPulse}
								initial='initial'
								animate='animate'
								className='flex items-center gap-2 text-white'
							>
								<CheckCircle className='h-5 w-5' />

								<span>You&apos;re on the list!</span>
							</motion.div>
						) : (
							<motion.div
								key='default'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className='flex items-center gap-2'
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
						variants={fadeIn}
						initial='hidden'
						animate='visible'
						exit='hidden'
						className='mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20'
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
						variants={fadeIn}
						initial='hidden'
						animate='visible'
						exit='hidden'
						className='mt-4 text-sm text-zinc-500 text-center'
					>
						Already signed up with a different email?{' '}

						<button
							type='button'
							onClick={() => {
								localStorage.removeItem(STORAGE_KEY);
								setPreviousEmail(null);
							}}
							className='text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors'
						>
							Use another email
						</button>
					</motion.p>
				)}
			</AnimatePresence>
		</div>
	);
}
