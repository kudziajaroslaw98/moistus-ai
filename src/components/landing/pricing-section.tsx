'use client';

import { PRICING_TIERS } from '@/constants/pricing-tiers';
import { Check, X } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function PricingSection() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
		'monthly'
	);

	return (
		<section
			id='pricing'
			ref={ref}
			className='relative py-32 px-4 sm:px-6 lg:px-8 bg-elevated/20'
		>
			<SectionDecoration variant='pricing' />
			<div className='relative z-10 max-w-4xl mx-auto'>
				{/* Header */}
				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
					}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.3, ease: EASE_OUT_QUART }
					}
					className='text-center mb-12'
				>
					<h2 className='font-lora text-3xl md:text-4xl font-bold text-text-primary mb-4'>
						Simple, Transparent Pricing
					</h2>
					<p className='text-lg text-text-secondary mb-8'>
						Start free, upgrade when you need more
					</p>

					{/* Billing toggle */}
					<div className='inline-flex items-center gap-3 p-1 rounded-lg bg-surface'>
						<button
							className={`px-4 py-2 rounded-md text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
								billingCycle === 'monthly'
									? 'bg-elevated text-text-primary'
									: 'bg-transparent text-text-secondary hover:text-text-primary'
							}`}
							onClick={() => setBillingCycle('monthly')}
						>
							Monthly
						</button>
						<button
							className={`px-4 py-2 rounded-md text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
								billingCycle === 'yearly'
									? 'bg-elevated text-text-primary'
									: 'bg-transparent text-text-secondary hover:text-text-primary'
							}`}
							onClick={() => setBillingCycle('yearly')}
						>
							Yearly
							<span className='ml-2 text-xs text-success-500'>Save 17%</span>
						</button>
					</div>
				</motion.div>

				{/* Pricing cards */}
				<div className='grid md:grid-cols-2 gap-8'>
					{PRICING_TIERS.map((tier, index) => (
						<div key={tier.id} className='group'>
							<motion.div
								initial={
									shouldReduceMotion
										? { opacity: 1, y: 0 }
										: { opacity: 0, y: 20 }
								}
								animate={isInView ? { opacity: 1, y: 0 } : {}}
								transition={
									shouldReduceMotion
										? { duration: 0 }
										: { duration: 0.3, ease: EASE_OUT_QUART, delay: index * 0.15 }
								}
								className={`relative rounded-xl p-6 border flex flex-col h-full translate-y-0 transition-all duration-200 ${
									tier.recommended
										? 'bg-elevated border-primary-500/50 shadow-[0_0_20px_rgba(96,165,250,0.15)] group-hover:shadow-[0_0_30px_rgba(96,165,250,0.25)] group-hover:-translate-y-1'
										: 'bg-surface border-border-subtle group-hover:border-primary-500/30 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-hover:-translate-y-1'
								}`}
							>
							{tier.recommended && (
								<div className='absolute -top-3 left-1/2 -translate-x-1/2'>
									<span className='text-xs font-semibold px-3 py-1 rounded-full bg-primary-600 text-zinc-100'>
										RECOMMENDED
									</span>
								</div>
							)}

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
									<span className='text-4xl font-bold text-text-primary'>
										$
										{billingCycle === 'monthly'
											? tier.monthlyPrice
											: Math.floor(tier.yearlyPrice / 12)}
									</span>
									<span className='text-text-secondary'>/month</span>
								</div>
								{/* Reserve space to prevent layout shift on toggle */}
								<p
									className={`text-sm mt-1 h-5 ${
										billingCycle === 'yearly' && tier.yearlyPrice > 0
											? 'text-text-tertiary'
											: 'invisible'
									}`}
								>
									${tier.yearlyPrice} billed annually
								</p>
							</div>

							<div className='space-y-3 mb-6'>
								{tier.features.map((feature) => (
									<div className='flex items-start gap-2' key={feature}>
										<Check aria-hidden="true" className='w-4 h-4 mt-0.5 shrink-0 text-success-500' />
										<span className='text-sm text-text-primary'>{feature}</span>
									</div>
								))}
								{tier.limitations?.map((limitation) => (
									<div className='flex items-start gap-2' key={limitation}>
										<X aria-hidden="true" className='w-4 h-4 mt-0.5 shrink-0 text-text-disabled' />
										<span className='text-sm text-text-disabled'>
											{limitation}
										</span>
									</div>
								))}
							</div>

							<a
								href={tier.id === 'free' ? '/dashboard' : '/auth/sign-up?plan=pro'}
								className={`mt-auto w-full inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium rounded-md transition-[background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
									tier.recommended
										? 'bg-primary-600 hover:bg-primary-500 text-white'
										: 'bg-elevated hover:bg-overlay text-text-primary'
								}`}
							>
								{tier.ctaText}
							</a>
							</motion.div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
