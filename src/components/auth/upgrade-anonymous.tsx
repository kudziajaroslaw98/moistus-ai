'use client';

import { PasswordRequirementsInfo } from '@/components/auth/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { OAuthProvider, UpgradeStep } from '@/store/app-state';
import useAppStore from '@/store/mind-map-store';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	ArrowLeft,
	CheckCircle2,
	Github,
	KeyRound,
	Mail,
	Save,
	Shield,
	Users,
	X,
	Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useShallow } from 'zustand/shallow';

// ============================================
// SCHEMAS
// ============================================

const EmailSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	displayName: z.preprocess(
		(val) => (val === '' ? undefined : val),
		z.string().min(1, 'Display name is required').max(50).optional()
	),
});

const OtpSchema = z.object({
	otp: z
		.string()
		.min(6, 'Code must be 6 digits')
		.max(6, 'Code must be 6 digits')
		.regex(/^\d+$/, 'Code must contain only numbers'),
});

const PasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
				'Must contain uppercase, lowercase, and number'
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type EmailForm = z.output<typeof EmailSchema>;
type OtpForm = z.output<typeof OtpSchema>;
type PasswordForm = z.output<typeof PasswordSchema>;

// ============================================
// ANIMATION CONFIG
// ============================================

const slideVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 300 : -300,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		x: direction < 0 ? 300 : -300,
		opacity: 0,
	}),
};

const slideTransition = {
	x: { type: 'spring', stiffness: 300, damping: 30 },
	opacity: { duration: 0.2 },
} as const;

// ============================================
// PROPS
// ============================================

interface UpgradeAnonymousPromptProps {
	isAnonymous: boolean;
	userDisplayName?: string;
	onUpgradeSuccess?: () => void;
	onDismiss?: () => void;
	autoShowDelay?: number;
	className?: string;
}

// ============================================
// STEP COMPONENTS
// ============================================

// Step 1: Choose upgrade method
function ChooseMethodStep({
	onSelectEmail,
	onSelectOAuth,
	isLoading,
}: {
	onSelectEmail: () => void;
	onSelectOAuth: (provider: OAuthProvider) => void;
	isLoading: boolean;
}) {
	const benefits = [
		{
			icon: Save,
			title: 'Create Your Own Mind Maps',
			description: 'Start building your own maps and organize your ideas',
		},
		{
			icon: Users,
			title: 'Share & Collaborate',
			description: 'Invite others and work together in real-time',
		},
		{
			icon: Zap,
			title: 'AI-Powered Features',
			description: 'Access smart suggestions and automated connections',
		},
		{
			icon: Shield,
			title: 'Save Your Work',
			description: 'Keep your maps safe with a permanent account',
		},
	];

	return (
		<div className='space-y-6'>
			{/* Benefits Grid */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
				{benefits.map((benefit, index) => {
					const Icon = benefit.icon;
					return (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='flex items-start space-x-3 p-3 bg-white/5 rounded-lg border border-white/5'
							initial={{ opacity: 0, y: 10 }}
							key={benefit.title}
							transition={{ delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
						>
							<div className='shrink-0 w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center'>
								<Icon className='w-4 h-4 text-primary-400' />
							</div>
							<div>
								<h3 className='font-medium text-white text-sm'>
									{benefit.title}
								</h3>
								<p className='text-text-secondary text-xs mt-0.5'>
									{benefit.description}
								</p>
							</div>
						</motion.div>
					);
				})}
			</div>

			{/* Divider */}
			<div className='relative'>
				<div className='absolute inset-0 flex items-center'>
					<div className='w-full border-t border-white/10' />
				</div>
				<div className='relative flex justify-center text-xs'>
					<span className='px-3 bg-zinc-900 text-text-tertiary'>
						Choose how to sign up
					</span>
				</div>
			</div>

			{/* OAuth Buttons */}
			<div className='space-y-3'>
				<Button
					variant='outline'
					size='lg'
					className='w-full justify-center gap-2 h-12'
					onClick={() => onSelectOAuth('google')}
					disabled={isLoading}
				>
					<svg className='w-5 h-5' viewBox='0 0 24 24'>
						<path
							fill='currentColor'
							d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
						/>
						<path
							fill='currentColor'
							d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
						/>
						<path
							fill='currentColor'
							d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
						/>
						<path
							fill='currentColor'
							d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
						/>
					</svg>
					Continue with Google
				</Button>

				<Button
					variant='outline'
					size='lg'
					className='w-full justify-center gap-2 h-12'
					onClick={() => onSelectOAuth('github')}
					disabled={isLoading}
				>
					<Github className='w-5 h-5' />
					Continue with GitHub
				</Button>
			</div>

			{/* Or separator */}
			<div className='relative'>
				<div className='absolute inset-0 flex items-center'>
					<div className='w-full border-t border-white/10' />
				</div>
				<div className='relative flex justify-center text-xs'>
					<span className='px-3 bg-zinc-900 text-text-tertiary'>or</span>
				</div>
			</div>

			{/* Email Button */}
			<Button
				variant='secondary'
				size='lg'
				className='w-full justify-center gap-2 h-12'
				onClick={onSelectEmail}
				disabled={isLoading}
			>
				<Mail className='w-5 h-5' />
				Sign up with Email
			</Button>
		</div>
	);
}

// Step 2: Enter email
function EnterEmailStep({
	onSubmit,
	onBack,
	isLoading,
	error,
	defaultDisplayName,
}: {
	onSubmit: (email: string, displayName?: string) => void;
	onBack: () => void;
	isLoading: boolean;
	error: string | null;
	defaultDisplayName?: string;
}) {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(EmailSchema),
		defaultValues: {
			email: '',
			displayName: defaultDisplayName || '',
		},
	});

	const handleFormSubmit = (data: EmailForm) => {
		onSubmit(data.email, data.displayName);
	};

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-5' noValidate>
			<div className='space-y-4'>
				<div>
					<label
						htmlFor='email'
						className='block text-sm font-medium text-text-secondary mb-2'
					>
						Email Address
					</label>
					<Input
						id='email'
						type='email'
						placeholder='your@email.com'
						disabled={isLoading}
						error={!!errors.email}
						{...register('email')}
					/>
					{errors.email && (
						<p className='mt-1.5 text-xs text-rose-400'>
							{errors.email.message}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor='displayName'
						className='block text-sm font-medium text-text-secondary mb-2'
					>
						Display Name <span className='text-text-tertiary'>(optional)</span>
					</label>
					<Input
						id='displayName'
						type='text'
						placeholder='Your name'
						disabled={isLoading}
						error={!!errors.displayName}
						{...register('displayName')}
					/>
					{errors.displayName && (
						<p className='mt-1.5 text-xs text-rose-400'>
							{errors.displayName.message}
						</p>
					)}
				</div>
			</div>

			{error && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className='p-3 bg-rose-900/30 border border-rose-700/50 rounded-lg'
				>
					<p className='text-rose-300 text-sm'>{error}</p>
				</motion.div>
			)}

			<div className='flex gap-3 pt-2'>
				<Button
					type='button'
					variant='ghost'
					size='lg'
					className='flex-1'
					onClick={onBack}
					disabled={isLoading}
				>
					<ArrowLeft className='w-4 h-4 mr-2' />
					Back
				</Button>
				<Button
					type='submit'
					variant='default'
					size='lg'
					className='flex-1'
					disabled={isLoading}
				>
					{isLoading ? (
						<>
							<Spinner size='sm' className='mr-2' />
							Sending...
						</>
					) : (
						'Continue'
					)}
				</Button>
			</div>
		</form>
	);
}

// Step 3: Verify OTP (final step - completes upgrade)
function VerifyOtpStep({
	email,
	onSubmit,
	onBack,
	onResend,
	isLoading,
	error,
}: {
	email: string;
	onSubmit: (otp: string) => void;
	onBack: () => void;
	onResend: () => void;
	isLoading: boolean;
	error: string | null;
}) {
	const [resendCooldown, setResendCooldown] = useState(0);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(OtpSchema),
		defaultValues: {
			otp: '',
		},
	});

	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCooldown]);

	const handleFormSubmit = (data: OtpForm) => {
		onSubmit(data.otp);
	};

	const handleResend = () => {
		if (resendCooldown === 0) {
			onResend();
			setResendCooldown(60);
		}
	};

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-5' noValidate>
			<div className='text-center mb-6'>
				<div className='w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-4'>
					<Mail className='w-8 h-8 text-primary-400' />
				</div>
				<h3 className='text-lg font-semibold text-white mb-2'>
					Check your email
				</h3>
				<p className='text-text-secondary text-sm'>
					We sent a verification code to{' '}
					<span className='text-white font-medium'>{email}</span>
				</p>
			</div>

			<div>
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
					maxLength={6}
					placeholder='000000'
					disabled={isLoading}
					error={!!errors.otp}
					className='text-center text-2xl tracking-[0.5em] font-mono'
					{...register('otp')}
				/>
				{errors.otp && (
					<p className='mt-1.5 text-xs text-rose-400 text-center'>
						{errors.otp.message}
					</p>
				)}
			</div>

			{error && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className='p-3 bg-rose-900/30 border border-rose-700/50 rounded-lg'
				>
					<p className='text-rose-300 text-sm text-center'>{error}</p>
				</motion.div>
			)}

			<div className='text-center'>
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
			</div>

			<div className='flex gap-3 pt-2'>
				<Button
					type='button'
					variant='ghost'
					size='lg'
					className='flex-1'
					onClick={onBack}
					disabled={isLoading}
				>
					<ArrowLeft className='w-4 h-4 mr-2' />
					Back
				</Button>
				<Button
					type='submit'
					variant='default'
					size='lg'
					className='flex-1'
					disabled={isLoading}
				>
					{isLoading ? (
						<>
							<Spinner size='sm' className='mr-2' />
							Verifying...
						</>
					) : (
						'Verify Code'
					)}
				</Button>
			</div>
		</form>
	);
}

// Step 2: Set password
function SetPasswordStep({
	onSubmit,
	onBack,
	isLoading,
	error,
}: {
	onSubmit: (password: string) => void;
	onBack: () => void;
	isLoading: boolean;
	error: string | null;
}) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm({
		resolver: zodResolver(PasswordSchema),
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
	});

	const password = watch('password', '');

	const handleFormSubmit = (data: PasswordForm) => {
		onSubmit(data.password);
	};

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-5' noValidate>
			<div className='text-center mb-6'>
				<div className='w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4'>
					<KeyRound className='w-8 h-8 text-emerald-400' />
				</div>
				<h3 className='text-lg font-semibold text-white mb-2'>
					Create your password
				</h3>
				<p className='text-text-secondary text-sm'>
					Almost there! Set a secure password for your account.
				</p>
			</div>

			<div className='space-y-4'>
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
						error={!!errors.password}
						{...register('password')}
					/>
					{errors.password && (
						<p className='mt-1.5 text-xs text-rose-400'>
							{errors.password.message}
						</p>
					)}
				</div>

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
						error={!!errors.confirmPassword}
						{...register('confirmPassword')}
					/>
					{errors.confirmPassword && (
						<p className='mt-1.5 text-xs text-rose-400'>
							{errors.confirmPassword.message}
						</p>
					)}
				</div>
			</div>

			{error && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className='p-3 bg-rose-900/30 border border-rose-700/50 rounded-lg'
				>
					<p className='text-rose-300 text-sm'>{error}</p>
				</motion.div>
			)}

			<div className='flex gap-3 pt-2'>
				<Button
					type='button'
					variant='ghost'
					size='lg'
					className='flex-1'
					onClick={onBack}
					disabled={isLoading}
				>
					<ArrowLeft className='w-4 h-4 mr-2' />
					Back
				</Button>
				<Button
					type='submit'
					variant='default'
					size='lg'
					className='flex-1'
					disabled={isLoading}
				>
						Continue
				</Button>
			</div>
		</form>
	);
}

// Step 4: Success
function SuccessStep({ onClose }: { onClose: () => void }) {
	const router = useRouter();
	const { getCurrentUser } = useAppStore(
		useShallow((state) => ({ getCurrentUser: state.getCurrentUser }))
	);

	const handleClose = useCallback(() => {
		getCurrentUser();
		onClose();
		router.push('/dashboard');
	}, [onClose]);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
			className='text-center py-6'
		>
			<div className='w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6'>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
				>
					<CheckCircle2 className='w-10 h-10 text-emerald-400' />
				</motion.div>
			</div>

			<h3 className='text-xl font-semibold text-white mb-3'>
				Account Created!
			</h3>
			<p className='text-text-secondary mb-8'>
				Your account has been successfully created. All your work has been
				preserved.
			</p>

			<Button
				variant='default'
				size='lg'
				className='w-full max-w-xs mx-auto'
				onClick={handleClose}
			>
				Continue to Dashboard
			</Button>
		</motion.div>
	);
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UpgradeAnonymousPrompt({
	isAnonymous,
	userDisplayName,
	onUpgradeSuccess,
	onDismiss,
	autoShowDelay = 5 * 60 * 1000,
	className = '',
}: UpgradeAnonymousPromptProps) {
	const {
		popoverOpen,
		setPopoverOpen,
		upgradeStep,
		upgradeEmail,
		upgradeError,
		isUpgrading,
		initiateEmailUpgrade,
		verifyUpgradeOtp,
		initiateOAuthUpgrade,
		resendUpgradeOtp,
		resetUpgradeState,
		setUpgradeStep,
		setUpgradePendingPassword,
	} = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			upgradeStep: state.upgradeStep,
			upgradeEmail: state.upgradeEmail,
			upgradeError: state.upgradeError,
			isUpgrading: state.isUpgrading,
			initiateEmailUpgrade: state.initiateEmailUpgrade,
			verifyUpgradeOtp: state.verifyUpgradeOtp,
			initiateOAuthUpgrade: state.initiateOAuthUpgrade,
			resendUpgradeOtp: state.resendUpgradeOtp,
			resetUpgradeState: state.resetUpgradeState,
			setUpgradeStep: state.setUpgradeStep,
			setUpgradePendingPassword: state.setUpgradePendingPassword,
		}))
	);

	const [isDismissed, setIsDismissed] = useState(false);
	const [direction, setDirection] = useState(1);

	// Map internal step to displayed step
	const getDisplayStep = useCallback((): UpgradeStep => {
		if (upgradeStep === 'idle' || upgradeStep === 'choose_method') {
			return 'choose_method';
		}
		return upgradeStep;
	}, [upgradeStep]);

	const displayStep = getDisplayStep();

	// Auto-show prompt after delay for anonymous users
	useEffect(() => {
		if (!isAnonymous || isDismissed) return;

		const timer = setTimeout(() => {
			setPopoverOpen({ upgradeUser: true });
		}, autoShowDelay);

		return () => clearTimeout(timer);
	}, [isAnonymous, isDismissed, autoShowDelay, setPopoverOpen]);

	// Don't render if user is not anonymous or has been dismissed
	if (!isAnonymous || isDismissed) return null;

	const handleDismiss = () => {
		setPopoverOpen({ upgradeUser: false });
		setIsDismissed(true);
		resetUpgradeState();
		onDismiss?.();
	};

	const handleClose = () => {
		setPopoverOpen({ upgradeUser: false });
		resetUpgradeState();
		if (displayStep === 'completed') {
			onUpgradeSuccess?.();
		}
	};

	// Navigation helpers
	const goToStep = (step: UpgradeStep, dir: number = 1) => {
		setDirection(dir);
		setUpgradeStep(step);
	};

	// Step handlers
	const handleSelectEmail = () => goToStep('enter_email', 1);
	const handleSelectOAuth = (provider: OAuthProvider) => {
		initiateOAuthUpgrade(provider);
	};

	const handleEmailSubmit = async (email: string, displayName?: string) => {
		const success = await initiateEmailUpgrade(email, displayName);
		if (success) {
			setDirection(1);
		}
	};

	// New flow: password is stored first, then OTP verification sets it
	const handlePasswordSubmit = (password: string) => {
		setUpgradePendingPassword(password);
		setDirection(1);
		setUpgradeStep('verify_otp');
	};

	const handleOtpSubmit = async (otp: string) => {
		const success = await verifyUpgradeOtp(otp);
		if (success) {
			setDirection(1);
		}
	};

	// Get header content based on step
	const getHeaderContent = () => {
		switch (displayStep) {
			case 'choose_method':
				return {
					title: 'Create Account to Start Building',
					subtitle:
						'Sign up for a free account to create your own mind maps and unlock all features',
				};
			case 'enter_email':
				return {
					title: 'Sign up with Email',
					subtitle: "We'll send you a verification code",
				};
			case 'set_password':
				return {
					title: 'Create Your Password',
					subtitle: 'Set a secure password for your account',
				};
			case 'verify_otp':
				return {
					title: 'Confirm Your Email',
					subtitle: 'Enter the code to complete signup',
				};
			case 'completed':
				return {
					title: 'Welcome!',
					subtitle: 'Your account is ready',
				};
			case 'oauth_pending':
				return {
					title: 'Connecting...',
					subtitle: 'Redirecting to sign in provider',
				};
			default:
				return {
					title: 'Create Account',
					subtitle: 'Sign up to get started',
				};
		}
	};

	const { title, subtitle } = getHeaderContent();

	// Render current step content
	const renderStepContent = () => {
		switch (displayStep) {
			case 'choose_method':
				return (
					<ChooseMethodStep
						onSelectEmail={handleSelectEmail}
						onSelectOAuth={handleSelectOAuth}
						isLoading={isUpgrading}
					/>
				);
			case 'enter_email':
				return (
					<EnterEmailStep
						onSubmit={handleEmailSubmit}
						onBack={() => goToStep('choose_method', -1)}
						isLoading={isUpgrading}
						error={upgradeError}
						defaultDisplayName={userDisplayName}
					/>
				);
			case 'set_password':
				return (
					<SetPasswordStep
						onSubmit={handlePasswordSubmit}
						onBack={() => goToStep('enter_email', -1)}
						isLoading={isUpgrading}
						error={upgradeError}
					/>
				);
			case 'verify_otp':
				return (
					<VerifyOtpStep
						email={upgradeEmail || ''}
						onSubmit={handleOtpSubmit}
						onBack={() => goToStep('set_password', -1)}
						onResend={resendUpgradeOtp}
						isLoading={isUpgrading}
						error={upgradeError}
					/>
				);
			case 'completed':
				return <SuccessStep onClose={handleClose} />;
			case 'oauth_pending':
				return (
					<div className='text-center py-12'>
						<Spinner size='lg' className='mx-auto mb-4' />
						<p className='text-text-secondary'>
							Redirecting to sign in provider...
						</p>
					</div>
				);
			case 'error':
				return (
					<div className='text-center py-8'>
						<div className='w-16 h-16 bg-rose-600/20 rounded-full flex items-center justify-center mx-auto mb-4'>
							<X className='w-8 h-8 text-rose-400' />
						</div>
						<h3 className='text-lg font-semibold text-white mb-2'>
							Something went wrong
						</h3>
						<p className='text-text-secondary mb-6'>
							{upgradeError || 'An unexpected error occurred'}
						</p>
						<Button
							variant='secondary'
							size='lg'
							onClick={() => goToStep('choose_method', -1)}
						>
							Try Again
						</Button>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<AnimatePresence>
			{popoverOpen.upgradeUser && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50'
						onClick={handleDismiss}
					/>

					{/* Modal */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
						className={`fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                       md:w-full md:max-w-lg bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50
                       overflow-hidden flex flex-col max-h-[90vh] ${className}`}
					>
						{/* Header */}
						<div className='relative bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5'>
							<button
								className='absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors'
								disabled={isUpgrading && displayStep === 'oauth_pending'}
								onClick={handleDismiss}
							>
								<X className='w-5 h-5 text-white/80' />
							</button>

							<AnimatePresence mode='wait'>
								<motion.div
									key={displayStep}
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 10 }}
									transition={{ duration: 0.15 }}
								>
									<h2 className='text-xl font-bold text-white pr-8'>{title}</h2>
									<p className='text-primary-100 text-sm mt-1'>{subtitle}</p>
								</motion.div>
							</AnimatePresence>

							{/* Progress indicator - New flow: email → password → OTP */}
							{displayStep !== 'choose_method' &&
								displayStep !== 'completed' &&
								displayStep !== 'error' &&
								displayStep !== 'oauth_pending' && (
									<div className='flex gap-1.5 mt-4'>
										{['enter_email', 'set_password', 'verify_otp'].map(
											(step, index) => (
												<div
													key={step}
													className={`h-1 flex-1 rounded-full transition-colors ${
														index <=
														[
															'enter_email',
															'set_password',
															'verify_otp',
														].indexOf(displayStep)
															? 'bg-white'
															: 'bg-white/30'
													}`}
												/>
											)
										)}
									</div>
								)}
						</div>

						{/* Content */}
						<div className='flex-1 overflow-y-auto p-6'>
							<AnimatePresence mode='wait' custom={direction}>
								<motion.div
									key={displayStep}
									custom={direction}
									variants={slideVariants}
									initial='enter'
									animate='center'
									exit='exit'
									transition={slideTransition}
								>
									{renderStepContent()}
								</motion.div>
							</AnimatePresence>
						</div>

						{/* Footer */}
						{displayStep !== 'completed' && displayStep !== 'error' && (
							<div className='px-6 py-4 border-t border-white/10'>
								<p className='text-text-tertiary text-xs text-center'>
									By creating an account, you agree to our Terms of Service and
									Privacy Policy. Your current progress will be preserved.
								</p>
							</div>
						)}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
