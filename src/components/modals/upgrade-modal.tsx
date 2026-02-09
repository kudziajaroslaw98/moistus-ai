'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import useAppStore from '@/store/mind-map-store';
import { AlertCircle, Check, Crown, Loader2, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface UpgradeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDismiss?: () => void;
	onSuccess?: () => void;
}

type BillingCycle = 'monthly' | 'yearly';

const features = [
	{
		icon: Zap,
		title: 'AI Thinking Partner',
		description:
			'100 AI suggestions per month, content generation, and smart connections',
	},
	{
		icon: Sparkles,
		title: 'Unlimited Everything',
		description: 'No limits on projects, nodes, or ideas',
	},
	{
		icon: Users,
		title: 'Real-time Collaboration',
		description: 'Work together in real-time',
	},
];

export function UpgradeModal({
	open,
	onOpenChange,
	onDismiss,
	onSuccess,
}: UpgradeModalProps) {
	const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { createCheckoutSession } = useAppStore();

	const handleMaybeLater = () => {
		onOpenChange(false);
		onDismiss?.();
	};

	const handleStartTrial = async () => {
		setIsRedirecting(true);
		setError(null);

		try {
			const result = await createCheckoutSession('pro', billingCycle);

			if (result.error) {
				setError(result.error);
				setIsRedirecting(false);
				return;
			}

			if (result.checkoutUrl) {
				// Redirect to Polar checkout
				window.location.href = result.checkoutUrl;
				// Note: onSuccess won't be called here since we're redirecting
				// The success callback would be handled on return from Polar
			} else {
				setError('Failed to create checkout session');
				setIsRedirecting(false);
			}
		} catch (err) {
			console.error('Error creating checkout session:', err);
			setError(err instanceof Error ? err.message : 'An unexpected error occurred');
			setIsRedirecting(false);
		}
	};

	const price = billingCycle === 'monthly' ? 12 : 120;
	const monthlyEquivalent = billingCycle === 'yearly' ? 10 : 12;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className='flex !w-full !max-w-3xl p-0 bg-surface border-border-subtle'
				showCloseButton={false}
			>
				<motion.div className='relative w-full flex flex-col' layout='size'>
					{/* Skip button */}
					<button
						className='absolute top-4 right-4 z-10 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200'
						disabled={isRedirecting}
						onClick={handleMaybeLater}
					>
						Maybe later
					</button>

					<div className='flex flex-col max-h-[85vh] overflow-y-auto p-6 sm:p-12'>
						{/* Header */}
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='text-center mb-6 sm:mb-8'
							initial={{ opacity: 0, y: -20 }}
							transition={{
								duration: 0.3,
								ease: [0.165, 0.84, 0.44, 1],
							}}
						>
							<div className='inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-primary-500/10 mb-3 sm:mb-4'>
								<Crown className='w-5 h-5 sm:w-7 sm:h-7 text-primary-500' />
							</div>

							<h2 className='text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 text-text-primary'>
								Upgrade to Pro
							</h2>

							<p className='text-base sm:text-lg text-text-secondary'>
								Unlock your full potential with unlimited access
							</p>
						</motion.div>

						{/* Pricing section */}
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='mb-6 sm:mb-8'
							initial={{ opacity: 0, y: 20 }}
							transition={{
								duration: 0.3,
								ease: [0.165, 0.84, 0.44, 1],
								delay: 0.1,
							}}
						>
							{/* Billing toggle */}
							<div className='flex justify-center mb-3 sm:mb-6'>
								<div className='inline-flex items-center gap-1 p-1 rounded-lg bg-elevated'>
									<button
										className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
											billingCycle === 'monthly'
												? 'bg-surface text-text-primary shadow-sm'
												: 'bg-transparent text-text-secondary hover:text-text-primary'
										}`}
										disabled={isRedirecting}
										onClick={() => setBillingCycle('monthly')}
									>
										Monthly
									</button>

									<button
										className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
											billingCycle === 'yearly'
												? 'bg-surface text-text-primary shadow-sm'
												: 'bg-transparent text-text-secondary hover:text-text-primary'
										}`}
										disabled={isRedirecting}
										onClick={() => setBillingCycle('yearly')}
									>
										Yearly
										<span className='ml-2 text-xs text-success-500'>
											Save 17%
										</span>
									</button>
								</div>
							</div>

							{/* Price display */}
							<div className='text-center'>
								<div className='flex items-baseline justify-center gap-1'>
									<span className='text-3xl sm:text-4xl font-bold text-text-primary'>
										${monthlyEquivalent}
									</span>
									<span className='text-text-secondary'>/month</span>
								</div>

								<p
									className={`text-sm mt-1 text-text-disabled ${billingCycle === 'yearly' ? 'visible' : 'invisible'}`}
								>
									${price} billed annually
								</p>

								<div className='flex items-center justify-center gap-2 mt-3'>
									<Check className='w-4 h-4 text-success-500' />
									<span className='text-sm text-success-500 font-medium'>
										14-day free trial included
									</span>
								</div>
							</div>
						</motion.div>

						{/* Error message */}
						{error && (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								className='flex items-center justify-center gap-2 text-sm text-error-500 mb-4 text-center max-w-md mx-auto'
								initial={{ opacity: 0, y: -10 }}
								transition={{
									duration: 0.2,
									ease: [0.165, 0.84, 0.44, 1],
								}}
							>
								<AlertCircle className='w-4 h-4 shrink-0' />
								<span>{error}</span>
							</motion.div>
						)}

						{/* CTA */}
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='flex justify-center'
							initial={{ opacity: 0, y: 20 }}
							transition={{
								duration: 0.3,
								ease: [0.165, 0.84, 0.44, 1],
								delay: 0.2,
							}}
						>
							<Button
								className='font-semibold px-12 py-6 text-base bg-primary-600 hover:bg-primary-500 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
								disabled={isRedirecting}
								onClick={handleStartTrial}
								size='lg'
							>
								{isRedirecting ? (
									<span className='flex items-center gap-2'>
										<Loader2 className='w-4 h-4 animate-spin' />
										Redirecting to Checkout...
									</span>
								) : (
									'Start Free Trial'
								)}
							</Button>
						</motion.div>

						{/* Features — rich cards on desktop, shown below CTA */}
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='hidden sm:block space-y-4 mt-8'
							initial={{ opacity: 0, y: 20 }}
							transition={{
								duration: 0.3,
								ease: [0.165, 0.84, 0.44, 1],
								delay: 0.3,
							}}
						>
							{features.map((feature, index) => (
								<motion.div
									key={feature.title}
									className='flex items-start gap-4 p-4 rounded-xl bg-elevated/50 border border-border-subtle'
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{
										duration: 0.25,
										ease: [0.165, 0.84, 0.44, 1],
										delay: 0.35 + index * 0.05,
									}}
								>
									<div className='flex items-center justify-center w-10 h-10 rounded-lg bg-primary-500/10 shrink-0'>
										<feature.icon className='w-5 h-5 text-primary-500' />
									</div>

									<div>
										<p className='font-medium text-text-primary'>
											{feature.title}
										</p>
										<p className='text-sm text-text-secondary'>
											{feature.description}
										</p>
									</div>
								</motion.div>
							))}
						</motion.div>

						{/* Features — compact checklist on mobile, shown below CTA */}
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='space-y-2 mt-6 sm:hidden'
							initial={{ opacity: 0, y: 20 }}
							transition={{
								duration: 0.3,
								ease: [0.165, 0.84, 0.44, 1],
								delay: 0.4,
							}}
						>
							{features.map((feature, index) => (
								<motion.div
									key={feature.title}
									className='flex items-center justify-center gap-2.5'
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{
										duration: 0.2,
										ease: [0.165, 0.84, 0.44, 1],
										delay: 0.42 + index * 0.04,
									}}
								>
									<Check className='w-4 h-4 text-primary-500 shrink-0' />
									<p className='text-sm font-medium text-text-primary text-center'>
										{feature.title}
									</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
