'use client';

import { Button } from '@/components/ui/button';
import useAppStore from '@/store/mind-map-store';
import { AlertCircle, Check, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface PricingStepProps {
	onContinue: () => void;
	onBack: () => void;
	selectedPlan: 'free' | 'pro' | null;
	billingCycle: 'monthly' | 'yearly';
}

interface PricingTier {
	id: 'free' | 'pro';
	name: string;
	description: string;
	monthlyPrice: number;
	yearlyPrice: number;
	discount?: string;
	features: string[];
	limitations?: string[];
	recommended?: boolean;
	ctaText: string;
}

const pricingTiers: PricingTier[] = [
	{
		id: 'free',
		name: 'Free',
		description: 'Start your clarity journey',
		monthlyPrice: 0,
		yearlyPrice: 0,
		features: [
			'3 projects to organize',
			'Map up to 50 ideas per project',
			'Share your thinking',
			'Join our community',
		],
		limitations: [
			'Unlock AI thinking partner with Pro',
			'Add collaborator access with Pro',
		],
		ctaText: 'Start Free',
	},
	{
		id: 'pro',
		name: 'Pro',
		description: 'For serious thinkers and collaborators',
		monthlyPrice: 12,
		yearlyPrice: 120,
		discount: '17% off',
		features: [
			'Organize unlimited projects',
			'No limits on your thinking',
			'AI thinking partner',
			'Team alignment in real-time',
			'Get unstuck faster',
			'Professional presentations & reports',
		],
		recommended: true,
		ctaText: 'Start Pro Trial',
	},
];

export function PricingStep({
	onContinue,
	onBack,
	selectedPlan,
	billingCycle,
}: PricingStepProps) {
	const { updateOnboardingData, fetchAvailablePlans, createCheckoutSession } =
		useAppStore();
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch available plans on mount
	useEffect(() => {
		fetchAvailablePlans();
	}, [fetchAvailablePlans]);

	const handleSelectPlan = (planId: 'free' | 'pro') => {
		updateOnboardingData({ selectedPlan: planId });
		setError(null);
	};

	const handleToggleBilling = () => {
		const newCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly';
		updateOnboardingData({ billingCycle: newCycle });
	};

	const handleContinue = async () => {
		if (!selectedPlan) {
			// Default to free if no plan selected
			updateOnboardingData({ selectedPlan: 'free' });
			onContinue();
			return;
		}

		if (selectedPlan === 'free') {
			// Free plan: just complete onboarding
			onContinue();
			return;
		}

		// Pro plan: create checkout session and redirect to Dodo
		setIsRedirecting(true);
		setError(null);

		const result = await createCheckoutSession('pro', billingCycle);

		if (result.error) {
			setError(result.error);
			setIsRedirecting(false);
			return;
		}

		if (result.checkoutUrl) {
			// Redirect to Dodo checkout
			window.location.href = result.checkoutUrl;
		} else {
			setError('Failed to create checkout session');
			setIsRedirecting(false);
		}
	};

	return (
		<div className='flex flex-col h-full p-12'>
			{/* Header */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-8'
				initial={{ opacity: 0, y: -20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
				}}
			>
				<h2 className='text-3xl font-bold mb-4 text-text-primary'>
					Choose How Fast You'll Grow
				</h2>

				<p className='text-lg mb-6 text-text-secondary'>
					Start creating clarity today, scale when you're ready
				</p>

				{/* Billing cycle toggle */}
				<div className='inline-flex items-center gap-3 p-1 rounded-lg bg-surface'>
					<button
						className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
							billingCycle === 'monthly'
								? 'bg-elevated text-text-primary'
								: 'bg-transparent text-text-secondary hover:text-text-primary'
						}`}
						onClick={handleToggleBilling}
					>
						Monthly
					</button>

					<button
						className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
							billingCycle === 'yearly'
								? 'bg-elevated text-text-primary'
								: 'bg-transparent text-text-secondary hover:text-text-primary'
						}`}
						onClick={handleToggleBilling}
					>
						Yearly
						<span className='ml-2 text-xs text-success-500'>Save 17%</span>
					</button>
				</div>
			</motion.div>

			{/* Pricing Cards */}
			<div className='grid grid-cols-2 gap-8 max-w-4xl mx-auto flex-1 mb-8'>
				{pricingTiers.map((tier, index) => (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className={`relative rounded-xl cursor-pointer text-xs border ${
							selectedPlan === tier.id
								? 'bg-elevated border-primary-500/50 shadow-[0_0_0_1px_rgba(96,165,250,0.3),0_0_0_2px_rgba(96,165,250,0.15)]'
								: 'bg-surface border-border-subtle hover:border-border-default'
						}`}
						initial={{ opacity: 0, y: 20 }}
						key={tier.id}
						onClick={() => handleSelectPlan(tier.id)}
						transition={{
							duration: 0.3,
							ease: [0.165, 0.84, 0.44, 1],
							delay: (index + 1) * 0.1,
						}}
					>
						{tier.recommended && (
							<div className='absolute -top-3 left-1/2 -translate-x-1/2'>
								<span className='text-xs font-semibold px-3 py-1 rounded-full bg-primary-600 text-zinc-100'>
									RECOMMENDED
								</span>
							</div>
						)}

						<div className='p-6 h-full flex flex-col'>
							<div className='mb-4'>
								<h3 className='text-xl font-semibold mb-2 text-text-primary'>
									{tier.name}
								</h3>

								<p className='text-sm text-text-secondary'>
									{tier.description}
								</p>
							</div>

							<div className='mb-6'>
								<div className='flex items-baseline gap-1'>
									<span className='text-3xl font-bold text-text-primary'>
										$
										{billingCycle === 'monthly'
											? tier.monthlyPrice
											: Math.floor(tier.yearlyPrice / 12)}
									</span>

									<span className='text-text-secondary'>/month</span>
								</div>

								{billingCycle === 'yearly' && tier.yearlyPrice > 0 && (
									<p className='text-sm mt-1 text-text-disabled'>
										${tier.yearlyPrice} billed annually
									</p>
								)}
							</div>

							<div className='space-y-3 flex-1'>
								{tier.features.map((feature) => (
									<div className='flex items-start gap-2' key={feature}>
										<Check className='w-4 h-4 mt-0.5 shrink-0 text-success-500' />

										<span className='text-sm text-text-primary'>{feature}</span>
									</div>
								))}

								{tier.limitations?.map((limitation) => (
									<div className='flex items-start gap-2' key={limitation}>
										<X className='w-4 h-4 mt-0.5 shrink-0 text-text-disabled' />

										<span className='text-sm text-text-disabled'>
											{limitation}
										</span>
									</div>
								))}
							</div>

							<Button
								className={`w-full mt-6 text-xs ${
									selectedPlan === tier.id
										? 'bg-primary-600 hover:bg-primary-500 text-base'
										: 'bg-elevated hover:bg-overlay text-text-primary'
								}`}
								onClick={(e) => {
									e.stopPropagation();
									handleSelectPlan(tier.id);
								}}
							>
								{selectedPlan === tier.id ? 'Selected' : `${tier.ctaText}`}
							</Button>
						</div>
					</motion.div>
				))}
			</div>

			{/* Error message */}
			{error && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='flex items-center justify-center gap-2 text-sm text-error-500 mb-4'
					initial={{ opacity: 0, y: -10 }}
					transition={{
						duration: 0.2,
						ease: [0.165, 0.84, 0.44, 1],
					}}
				>
					<AlertCircle className='w-4 h-4' />
					<span>{error}</span>
				</motion.div>
			)}

			{/* Navigation */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='flex items-center justify-between'
				initial={{ opacity: 0, y: 20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1],
					delay: 0.4,
				}}
			>
				<Button
					className='text-text-secondary hover:text-text-primary transition-colors duration-200'
					disabled={isRedirecting}
					onClick={onBack}
					variant='ghost'
				>
					Back
				</Button>

				<Button
					className={`font-semibold px-8 transition-all duration-200 ${
						selectedPlan && !isRedirecting
							? 'bg-primary-600 hover:bg-primary-500 text-base hover:-translate-y-0.5'
							: 'bg-elevated text-text-disabled opacity-50 cursor-not-allowed'
					}`}
					disabled={!selectedPlan || isRedirecting}
					onClick={handleContinue}
					size='lg'
				>
					{isRedirecting ? (
						<span className='flex items-center gap-2'>
							<Loader2 className='w-4 h-4 animate-spin' />
							Redirecting...
						</span>
					) : selectedPlan === 'free' ? (
						'Start Free'
					) : (
						'Continue to Checkout'
					)}
				</Button>
			</motion.div>
		</div>
	);
}
