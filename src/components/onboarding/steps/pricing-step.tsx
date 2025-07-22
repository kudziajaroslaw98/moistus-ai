'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useAppStore from '@/store/mind-map-store';
import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';

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
		description: 'Perfect for personal use',
		monthlyPrice: 0,
		yearlyPrice: 0,
		features: [
			'3 mind maps',
			'50 nodes per map',
			'Basic export',
			'Community support',
		],
		limitations: ['No AI suggestions', 'No real-time collaboration'],
		ctaText: 'Start Free',
	},
	{
		id: 'pro',
		name: 'Pro',
		description: 'For professionals and teams',
		monthlyPrice: 12,
		yearlyPrice: 120,
		discount: '17% off',
		features: [
			'Unlimited mind maps',
			'Unlimited nodes',
			'AI-powered suggestions',
			'Real-time collaboration',
			'Priority support',
			'Advanced export options',
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
	const { updateOnboardingData, fetchAvailablePlans } = useAppStore();

	// Fetch available plans on mount
	useEffect(() => {
		fetchAvailablePlans();
	}, [fetchAvailablePlans]);

	const handleSelectPlan = (planId: 'free' | 'pro') => {
		updateOnboardingData({ selectedPlan: planId });
	};

	const handleToggleBilling = () => {
		const newCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly';
		updateOnboardingData({ billingCycle: newCycle });
	};

	const handleContinue = () => {
		if (!selectedPlan) {
			// Default to free if no plan selected
			updateOnboardingData({ selectedPlan: 'free' });
		}

		onContinue();
	};

	return (
		<div className='flex flex-col h-full p-12'>
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-8'
			>
				<h2 className='text-3xl font-bold text-zinc-50 mb-4'>
					Choose Your Plan
				</h2>

				<p className='text-lg text-zinc-400 mb-6'>
					Start free, upgrade anytime
				</p>

				{/* Billing cycle toggle */}
				<div className='inline-flex items-center gap-3 p-1 bg-zinc-800 rounded-lg'>
					<button
						onClick={handleToggleBilling}
						className={cn(
							'px-4 py-2 rounded-md text-sm font-medium transition-all',
							billingCycle === 'monthly'
								? 'bg-zinc-700 text-zinc-50'
								: 'text-zinc-400 hover:text-zinc-300'
						)}
					>
						Monthly
					</button>

					<button
						onClick={handleToggleBilling}
						className={cn(
							'px-4 py-2 rounded-md text-sm font-medium transition-all',
							billingCycle === 'yearly'
								? 'bg-zinc-700 text-zinc-50'
								: 'text-zinc-400 hover:text-zinc-300'
						)}
					>
						Yearly
						<span className='ml-2 text-xs text-teal-400'>Save 17%</span>
					</button>
				</div>
			</motion.div>

			{/* Pricing Cards */}
			<div className='grid grid-cols-2 gap-8 max-w-4xl mx-auto flex-1 mb-8'>
				{pricingTiers.map((tier, index) => (
					<motion.div
						key={tier.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						className={cn(
							'relative rounded-xl border transition-all cursor-pointer',
							selectedPlan === tier.id
								? 'border-teal-500 bg-zinc-800/80'
								: 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600',
							tier.recommended && 'ring-2 ring-teal-500/20'
						)}
						onClick={() => handleSelectPlan(tier.id)}
					>
						{tier.recommended && (
							<div className='absolute -top-3 left-1/2 -translate-x-1/2'>
								<span className='bg-teal-500 text-zinc-900 text-xs font-semibold px-3 py-1 rounded-full'>
									RECOMMENDED
								</span>
							</div>
						)}

						<div className='p-6 h-full flex flex-col'>
							<div className='mb-4'>
								<h3 className='text-xl font-semibold text-zinc-50 mb-2'>
									{tier.name}
								</h3>

								<p className='text-sm text-zinc-400'>{tier.description}</p>
							</div>

							<div className='mb-6'>
								<div className='flex items-baseline gap-1'>
									<span className='text-3xl font-bold text-zinc-50'>
										$
										{billingCycle === 'monthly'
											? tier.monthlyPrice
											: Math.floor(tier.yearlyPrice / 12)}
									</span>

									<span className='text-zinc-400'>/month</span>
								</div>

								{billingCycle === 'yearly' && tier.yearlyPrice > 0 && (
									<p className='text-sm text-zinc-500 mt-1'>
										${tier.yearlyPrice} billed annually
									</p>
								)}
							</div>

							<div className='space-y-3 flex-1'>
								{tier.features.map((feature) => (
									<div key={feature} className='flex items-start gap-2'>
										<Check className='w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0' />

										<span className='text-sm text-zinc-300'>{feature}</span>
									</div>
								))}

								{tier.limitations?.map((limitation) => (
									<div key={limitation} className='flex items-start gap-2'>
										<X className='w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0' />

										<span className='text-sm text-zinc-500'>{limitation}</span>
									</div>
								))}
							</div>

							<Button
								className={cn(
									'w-full mt-6',
									selectedPlan === tier.id
										? 'bg-teal-500 hover:bg-teal-600 text-zinc-900'
										: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-50'
								)}
								onClick={(e) => {
									e.stopPropagation();
									handleSelectPlan(tier.id);
								}}
							>
								{selectedPlan === tier.id ? 'Selected' : tier.ctaText}
							</Button>
						</div>
					</motion.div>
				))}
			</div>

			{/* Navigation */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className='flex items-center justify-between'
			>
				<Button
					onClick={onBack}
					variant='ghost'
					className='text-zinc-400 hover:text-zinc-300'
				>
					Back
				</Button>

				<Button
					onClick={handleContinue}
					size='lg'
					className='bg-teal-500 hover:bg-teal-600 text-zinc-900 font-semibold px-8'
					disabled={!selectedPlan}
				>
					{selectedPlan === 'free' ? 'Start Free' : 'Continue to Payment'}
				</Button>
			</motion.div>
		</div>
	);
}
