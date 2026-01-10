'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { otpSchema, type OtpFormData } from '@/lib/validations/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface OtpStepProps {
	email: string;
	onSubmit: (otp: string) => void;
	onResend: () => void;
	onBack: () => void;
	isLoading: boolean;
	error: string | null;
}

const RESEND_COOLDOWN = 60; // seconds

export function OtpStep({
	email,
	onSubmit,
	onResend,
	onBack,
	isLoading,
	error,
}: OtpStepProps) {
	const [resendCooldown, setResendCooldown] = useState(0);
	const shouldReduceMotion = useReducedMotion();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<OtpFormData>({
		resolver: zodResolver(otpSchema),
		defaultValues: {
			email,
			otp: '',
		},
	});

	// Resend cooldown timer
	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCooldown]);

	const handleFormSubmit = (data: OtpFormData) => {
		onSubmit(data.otp);
	};

	const handleResend = () => {
		if (resendCooldown === 0 && !isLoading) {
			onResend();
			setResendCooldown(RESEND_COOLDOWN);
		}
	};

	// Mask email for display
	const [localPart, domain] = email.split('@');
	const maskedEmail = `${localPart.charAt(0)}${'*'.repeat(Math.min(localPart.length - 1, 5))}@${domain}`;

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6' noValidate>
			{/* Email icon and info */}
			<motion.div
				className='text-center'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
			>
				<div className='w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4'>
					<Mail className='w-8 h-8 text-primary-400' />
				</div>
				<p className='text-text-secondary text-sm'>
					We sent a verification code to{' '}
					<span className='text-white font-medium'>{maskedEmail}</span>
				</p>
			</motion.div>

			{/* OTP Input */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1, duration: 0.25 }}
			>
				<label
					htmlFor='otp'
					className='block text-sm font-medium text-text-secondary mb-2 text-center'
				>
					Enter 6-digit code
				</label>
				<Input
					id='otp'
					type='text'
					inputMode='numeric'
					autoComplete='one-time-code'
					maxLength={6}
					placeholder='000000'
					disabled={isLoading}
					className='h-14 text-center text-2xl tracking-[0.5em] font-mono bg-white/5 border-white/10 text-white placeholder:text-text-quaternary focus:border-primary-500/50 focus:ring-primary-500/20'
					{...register('otp')}
				/>
				{errors.otp && (
					<p className='mt-1.5 text-xs text-error-400 text-center'>
						{errors.otp.message}
					</p>
				)}
			</motion.div>

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

			{/* Resend link */}
			<motion.div
				className='text-center'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2, duration: 0.25 }}
			>
				<button
					type='button'
					onClick={handleResend}
					disabled={resendCooldown > 0 || isLoading}
					className='text-sm text-primary-400 hover:text-primary-300 disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors'
				>
					{resendCooldown > 0
						? `Resend code in ${resendCooldown}s`
						: "Didn't receive code? Resend"}
				</button>
			</motion.div>

			{/* Buttons */}
			<motion.div
				className='flex gap-3'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25, duration: 0.25 }}
			>
				<Button
					type='button'
					variant='ghost'
					onClick={onBack}
					disabled={isLoading}
					className='flex-1 h-12 text-text-secondary hover:text-white hover:bg-white/5'
				>
					<ArrowLeft className='w-4 h-4 mr-2' />
					Back
				</Button>
				<Button
					type='submit'
					disabled={isLoading}
					className='flex-1 h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200'
				>
					{isLoading ? (
						<>
							<Loader2 className='h-5 w-5 animate-spin mr-2' />
							Verifying...
						</>
					) : (
						'Verify'
					)}
				</Button>
			</motion.div>
		</form>
	);
}
