'use client';

import {
	OAuthButtons,
	OAuthDivider,
	PasswordRequirementsInfo,
	type OAuthProvider,
} from '@/components/auth/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signUpFormSchema, type SignUpFormData } from '@/lib/validations/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Mail, User } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

interface FormStepProps {
	onSubmit: (data: {
		email: string;
		displayName?: string;
		password: string;
	}) => void;
	onOAuthSelect: (provider: OAuthProvider) => void;
	isLoading: boolean;
	error: string | null;
	defaultValues?: {
		email?: string;
		displayName?: string;
	};
}

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

export function FormStep({
	onSubmit,
	onOAuthSelect,
	isLoading,
	error,
	defaultValues,
}: FormStepProps) {
	const shouldReduceMotion = useReducedMotion();

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<SignUpFormData>({
		resolver: zodResolver(signUpFormSchema),
		defaultValues: {
			email: defaultValues?.email ?? '',
			displayName: defaultValues?.displayName ?? '',
			password: '',
			confirmPassword: '',
		},
	});

	const password = watch('password', '');

	const handleFormSubmit = (data: SignUpFormData) => {
		onSubmit({
			email: data.email,
			// Convert empty string to undefined for display name
			displayName: data.displayName.trim() || undefined,
			password: data.password,
		});
	};

	return (
		<div className='space-y-6'>
			{/* OAuth Buttons */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.1, duration: 0.25, ease: easeOutQuart }
				}
			>
				<OAuthButtons
					onSelectProvider={onOAuthSelect}
					disabled={isLoading}
					label='sign-up'
				/>
			</motion.div>

			{/* Divider */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.15, duration: 0.25, ease: easeOutQuart }
				}
			>
				<OAuthDivider text='or sign up with email' />
			</motion.div>

			{/* Form */}
			<motion.form
				className='space-y-4'
				onSubmit={handleSubmit(handleFormSubmit)}
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.2, duration: 0.25, ease: easeOutQuart }
				}
				noValidate
			>
				{/* Email */}
				<div>
					<label
						htmlFor='email'
						className='block text-sm font-medium text-text-secondary mb-2'
					>
						Email
					</label>
					<div className='relative'>
						<Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary pointer-events-none' />
						<Input
							id='email'
							type='email'
							placeholder='you@example.com'
							disabled={isLoading}
							className='pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
							{...register('email')}
						/>
					</div>
					{errors.email && (
						<p className='mt-1.5 text-xs text-error-400'>
							{errors.email.message}
						</p>
					)}
				</div>

				{/* Display Name */}
				<div>
					<label
						htmlFor='displayName'
						className='block text-sm font-medium text-text-secondary mb-2'
					>
						Display Name{' '}
						<span className='text-text-tertiary font-normal'>(optional)</span>
					</label>
					<div className='relative'>
						<User className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary pointer-events-none' />
						<Input
							id='displayName'
							type='text'
							placeholder='How should we call you?'
							disabled={isLoading}
							className='pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
							{...register('displayName')}
						/>
					</div>
					{errors.displayName && (
						<p className='mt-1.5 text-xs text-error-400'>
							{errors.displayName.message}
						</p>
					)}
				</div>

				{/* Password */}
				<div>
					<label
						htmlFor='password'
						className='flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-2'
					>
						Password
						<PasswordRequirementsInfo password={password} />
					</label>
					<Input
						id='password'
						type='password'
						placeholder='Create a secure password'
						disabled={isLoading}
						className='h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
						{...register('password')}
					/>
					{errors.password && (
						<p className='mt-1.5 text-xs text-error-400'>
							{errors.password.message}
						</p>
					)}
				</div>

				{/* Confirm Password */}
				<div>
					<label
						htmlFor='confirmPassword'
						className='block text-sm font-medium text-text-secondary mb-2'
					>
						Confirm Password
					</label>
					<Input
						id='confirmPassword'
						type='password'
						placeholder='Confirm your password'
						disabled={isLoading}
						className='h-12 bg-white/5 border-white/10 text-white placeholder:text-text-tertiary focus:border-primary-500/50 focus:ring-primary-500/20'
						{...register('confirmPassword')}
					/>
					{errors.confirmPassword && (
						<p className='mt-1.5 text-xs text-error-400'>
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

				{/* Submit button - extra top margin to prevent accidental clicks */}
				<Button
					type='submit'
					disabled={isLoading}
					className='w-full h-12 mt-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200'
				>
					{isLoading ? (
						<>
							<Loader2 className='h-5 w-5 animate-spin mr-2' />
							Creating account...
						</>
					) : (
						'Create Account'
					)}
				</Button>
			</motion.form>

			{/* Sign in link */}
			<motion.p
				className='text-center text-sm text-text-secondary'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.3, duration: 0.25, ease: easeOutQuart }
				}
			>
				Already have an account?{' '}
				<Link
					href='/auth/sign-in'
					className='font-medium text-primary-400 hover:text-primary-300 transition-colors'
				>
					Sign In
				</Link>
			</motion.p>
		</div>
	);
}
