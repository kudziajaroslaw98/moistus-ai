'use client';

import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { Button } from '@/components/ui/button';
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
				animate={{ opacity: 1, y: 0 }}
				className='text-center mb-8'
				initial={{ opacity: 0, y: -20 }}
				transition={{
					duration: 0.3,
					ease: [0.165, 0.84, 0.44, 1], // ease-out-quart
				}}
			>
				<h2
					className='text-3xl font-bold mb-4'
					style={{ color: GlassmorphismTheme.text.high }}
				>
					Choose Your Plan
				</h2>

				<p
					className='text-lg mb-6'
					style={{ color: GlassmorphismTheme.text.medium }}
				>
					Start free, upgrade anytime
				</p>

				{/* Billing cycle toggle */}
				<div
					className='inline-flex items-center gap-3 p-1 rounded-lg'
					style={{
						backgroundColor: GlassmorphismTheme.elevation[2],
					}}
				>
					<button
						className='px-4 py-2 rounded-md text-sm font-medium transition-all'
						style={{
							backgroundColor:
								billingCycle === 'monthly'
									? GlassmorphismTheme.elevation[4]
									: 'transparent',
							color:
								billingCycle === 'monthly'
									? GlassmorphismTheme.text.high
									: GlassmorphismTheme.text.medium,
							transitionDuration: '200ms',
							transitionTimingFunction: 'ease',
						}}
						onClick={handleToggleBilling}
						onMouseEnter={(e) => {
							if (billingCycle !== 'monthly') {
								e.currentTarget.style.color = GlassmorphismTheme.text.high;
							}
						}}
						onMouseLeave={(e) => {
							if (billingCycle !== 'monthly') {
								e.currentTarget.style.color = GlassmorphismTheme.text.medium;
							}
						}}
					>
						Monthly
					</button>

					<button
						className='px-4 py-2 rounded-md text-sm font-medium transition-all'
						style={{
							backgroundColor:
								billingCycle === 'yearly'
									? GlassmorphismTheme.elevation[4]
									: 'transparent',
							color:
								billingCycle === 'yearly'
									? GlassmorphismTheme.text.high
									: GlassmorphismTheme.text.medium,
							transitionDuration: '200ms',
							transitionTimingFunction: 'ease',
						}}
						onClick={handleToggleBilling}
						onMouseEnter={(e) => {
							if (billingCycle !== 'yearly') {
								e.currentTarget.style.color = GlassmorphismTheme.text.high;
							}
						}}
						onMouseLeave={(e) => {
							if (billingCycle !== 'yearly') {
								e.currentTarget.style.color = GlassmorphismTheme.text.medium;
							}
						}}
					>
						Yearly
						<span
							className='ml-2 text-xs'
							style={{ color: GlassmorphismTheme.indicators.status.complete }}
						>
							Save 17%
						</span>
					</button>
				</div>
			</motion.div>

			{/* Pricing Cards */}
			<div className='grid grid-cols-2 gap-8 max-w-4xl mx-auto flex-1 mb-8'>
				{pricingTiers.map((tier, index) => (
					<motion.div
						layout
						animate={{ opacity: 1, y: 0 }}
						className='relative rounded-xl cursor-pointer'
						initial={{ opacity: 0, y: 20 }}
						key={tier.id}
						style={{
							border: `1px solid ${
								selectedPlan === tier.id
									? GlassmorphismTheme.borders.selected
									: GlassmorphismTheme.borders.default
							}`,
							backgroundColor:
								selectedPlan === tier.id
									? GlassmorphismTheme.elevation[2]
									: GlassmorphismTheme.elevation[1],
							backdropFilter: GlassmorphismTheme.effects.glassmorphism,
							boxShadow:
								tier.recommended && selectedPlan === tier.id
									? GlassmorphismTheme.effects.selectedShadow
									: 'none',
						}}
						transition={{
							duration: 0.3,
							ease: [0.165, 0.84, 0.44, 1],
							delay: (index + 1) * 0.1,
						}}
						onClick={() => handleSelectPlan(tier.id)}
						onMouseEnter={(e) => {
							if (selectedPlan !== tier.id) {
								e.currentTarget.style.borderColor =
									GlassmorphismTheme.borders.hover;
							}
						}}
						onMouseLeave={(e) => {
							if (selectedPlan !== tier.id) {
								e.currentTarget.style.borderColor =
									GlassmorphismTheme.borders.default;
							}
						}}
					>
						{tier.recommended && (
							<div className='absolute -top-3 left-1/2 -translate-x-1/2'>
								<span
									className='text-xs font-semibold px-3 py-1 rounded-full'
									style={{
										backgroundColor: 'rgba(52, 211, 153, 0.8)',
										color: GlassmorphismTheme.elevation[0],
									}}
								>
									RECOMMENDED
								</span>
							</div>
						)}

						<div className='p-6 h-full flex flex-col'>
							<div className='mb-4'>
								<h3
									className='text-xl font-semibold mb-2'
									style={{ color: GlassmorphismTheme.text.high }}
								>
									{tier.name}
								</h3>

								<p
									className='text-sm'
									style={{ color: GlassmorphismTheme.text.medium }}
								>
									{tier.description}
								</p>
							</div>

							<div className='mb-6'>
								<div className='flex items-baseline gap-1'>
									<span
										className='text-3xl font-bold'
										style={{ color: GlassmorphismTheme.text.high }}
									>
										$
										{billingCycle === 'monthly'
											? tier.monthlyPrice
											: Math.floor(tier.yearlyPrice / 12)}
									</span>

									<span style={{ color: GlassmorphismTheme.text.medium }}>
										/month
									</span>
								</div>

								{billingCycle === 'yearly' && tier.yearlyPrice > 0 && (
									<p
										className='text-sm mt-1'
										style={{ color: GlassmorphismTheme.text.disabled }}
									>
										${tier.yearlyPrice} billed annually
									</p>
								)}
							</div>

							<div className='space-y-3 flex-1'>
								{tier.features.map((feature) => (
									<div className='flex items-start gap-2' key={feature}>
										<Check
											className='w-4 h-4 mt-0.5 flex-shrink-0'
											style={{
												color: GlassmorphismTheme.indicators.status.complete,
											}}
										/>

										<span
											className='text-sm'
											style={{ color: GlassmorphismTheme.text.high }}
										>
											{feature}
										</span>
									</div>
								))}

								{tier.limitations?.map((limitation) => (
									<div className='flex items-start gap-2' key={limitation}>
										<X
											className='w-4 h-4 mt-0.5 flex-shrink-0'
											style={{ color: GlassmorphismTheme.text.disabled }}
										/>

										<span
											className='text-sm'
											style={{ color: GlassmorphismTheme.text.disabled }}
										>
											{limitation}
										</span>
									</div>
								))}
							</div>

							<Button
								className='w-full mt-6 transition-all font-medium'
								style={{
									backgroundColor:
										selectedPlan === tier.id
											? 'rgba(52, 211, 153, 0.8)'
											: GlassmorphismTheme.elevation[4],
									color:
										selectedPlan === tier.id
											? GlassmorphismTheme.elevation[0]
											: GlassmorphismTheme.text.high,
									transitionDuration: '200ms',
									transitionTimingFunction: 'ease',
								}}
								onClick={(e) => {
									e.stopPropagation();
									handleSelectPlan(tier.id);
								}}
								onMouseEnter={(e) => {
									if (selectedPlan === tier.id) {
										e.currentTarget.style.backgroundColor =
											'rgba(52, 211, 153, 1)';
									} else {
										e.currentTarget.style.backgroundColor =
											GlassmorphismTheme.elevation[6];
									}
								}}
								onMouseLeave={(e) => {
									if (selectedPlan === tier.id) {
										e.currentTarget.style.backgroundColor =
											'rgba(52, 211, 153, 0.8)';
									} else {
										e.currentTarget.style.backgroundColor =
											GlassmorphismTheme.elevation[4];
									}
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
					className='transition-colors'
					variant='ghost'
					style={{
						color: GlassmorphismTheme.text.medium,
						transitionDuration: '200ms',
						transitionTimingFunction: 'ease',
					}}
					onClick={onBack}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = GlassmorphismTheme.text.high;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = GlassmorphismTheme.text.medium;
					}}
				>
					Back
				</Button>

				<Button
					className='font-semibold px-8 transition-all'
					disabled={!selectedPlan}
					size='lg'
					style={{
						backgroundColor: selectedPlan
							? 'rgba(52, 211, 153, 0.8)'
							: GlassmorphismTheme.elevation[4],
						color: selectedPlan
							? GlassmorphismTheme.elevation[0]
							: GlassmorphismTheme.text.disabled,
						transitionDuration: '200ms',
						transitionTimingFunction: 'ease',
						opacity: selectedPlan ? 1 : 0.5,
					}}
					onClick={handleContinue}
					onMouseEnter={(e) => {
						if (selectedPlan) {
							e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 1)';
							e.currentTarget.style.transform = 'translateY(-2px)';
						}
					}}
					onMouseLeave={(e) => {
						if (selectedPlan) {
							e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.8)';
							e.currentTarget.style.transform = 'translateY(0)';
						}
					}}
				>
					{selectedPlan === 'free' ? 'Start Free' : 'Continue to Payment'}
				</Button>
			</motion.div>
		</div>
	);
}
