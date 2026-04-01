'use client';

import { PRICING_TIERS } from '@/constants/pricing-tiers';
import { Check, X } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { GrainOverlay } from './grain-overlay';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;
const pricingHighlights = [
	'Start free on the real canvas',
	'Upgrade when you need AI and unlimited scale',
	'Annual billing saves 17%',
] as const;

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
			className='relative overflow-hidden bg-surface/55 px-4 py-24 sm:px-6 lg:px-8 lg:py-28'
		>
			<GrainOverlay />
			<div className='relative z-10 mx-auto max-w-6xl'>
				<div className='grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:items-start'>
					<motion.div
						initial={
							shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }
						}
						animate={isInView ? { opacity: 1, y: 0 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.42, ease: EASE_OUT_QUART }
						}
						className='max-w-lg'
					>
						<p className='text-xs font-medium uppercase tracking-[0.28em] text-primary-300/70'>
							Pricing
						</p>
						<h2 className='mt-4 max-w-[14ch] text-balance font-lora text-3xl font-bold leading-[1.08] tracking-tight text-text-primary md:text-5xl'>
							Start on the real canvas. Upgrade when the workflow earns it.
						</h2>
						<p className='mt-5 max-w-[36rem] text-pretty text-base leading-7 text-text-secondary md:text-lg'>
							Free gives you active maps and core export. Pro is for heavier
							usage: unlimited scale, AI assistance, and live collaboration
							without caps getting in the way.
						</p>

						<div className='mt-8 flex flex-wrap gap-3'>
							{pricingHighlights.map((highlight) => (
								<div
									key={highlight}
									className='rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-text-secondary backdrop-blur-xl'
								>
									{highlight}
								</div>
							))}
						</div>
					</motion.div>

					<div>
						<motion.div
							initial={
								shouldReduceMotion
									? { opacity: 1, y: 0 }
									: { opacity: 0, y: 18 }
							}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={
								shouldReduceMotion
									? { duration: 0 }
									: { duration: 0.42, ease: EASE_OUT_QUART, delay: 0.06 }
							}
							className='mb-6 flex justify-start lg:justify-end'
						>
							<div className='inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/20 p-1 backdrop-blur-xl'>
								<button
									className={`rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
										billingCycle === 'monthly'
											? 'bg-elevated text-text-primary'
											: 'bg-transparent text-text-secondary hover:text-text-primary'
									}`}
									onClick={() => setBillingCycle('monthly')}
								>
									Monthly
								</button>
								<button
									className={`rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
										billingCycle === 'yearly'
											? 'bg-elevated text-text-primary'
											: 'bg-transparent text-text-secondary hover:text-text-primary'
									}`}
									onClick={() => setBillingCycle('yearly')}
								>
									Yearly
									<span className='ml-2 text-xs text-success-500'>
										Save 17%
									</span>
								</button>
							</div>
						</motion.div>

						<div className='grid gap-6 md:grid-cols-2'>
							{PRICING_TIERS.map((tier, index) => (
								<div key={tier.id} className='group'>
									<motion.div
										initial={
											shouldReduceMotion
												? { opacity: 1, y: 0 }
												: { opacity: 0, y: 18 }
										}
										animate={isInView ? { opacity: 1, y: 0 } : {}}
										transition={
											shouldReduceMotion
												? { duration: 0 }
												: {
														duration: 0.4,
														ease: EASE_OUT_QUART,
														delay: 0.12 + index * 0.1,
													}
										}
										className={`relative flex h-full flex-col rounded-[1.65rem] border p-6 shadow-[0_18px_60px_rgba(0,0,0,0.24)] transition-colors duration-200 ${
											tier.recommended
												? 'border-primary-400/25 bg-[linear-gradient(180deg,rgba(16,22,34,0.98),rgba(10,14,22,0.92))]'
												: 'border-white/8 bg-[linear-gradient(180deg,rgba(17,20,28,0.94),rgba(11,13,18,0.88))]'
										}`}
									>
										{tier.recommended && (
											<div className='absolute -top-3 left-6'>
												<span className='rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900'>
													Recommended
												</span>
											</div>
										)}

										<div className='mb-5'>
											<h3 className='text-xl font-semibold text-text-primary'>
												{tier.name}
											</h3>
											<p className='mt-2 text-sm leading-6 text-text-secondary'>
												{tier.description}
											</p>
										</div>

										<div className='mb-6 border-y border-white/6 py-5'>
											<div className='flex items-baseline gap-1'>
												<span className='text-4xl font-bold text-text-primary'>
													$
													{billingCycle === 'monthly'
														? tier.monthlyPrice
														: Math.floor(tier.yearlyPrice / 12)}
												</span>
												<span className='text-text-secondary'>/month</span>
											</div>
											<p
												className={`mt-1 h-5 text-sm ${
													billingCycle === 'yearly' && tier.yearlyPrice > 0
														? 'text-text-tertiary'
														: 'invisible'
												}`}
											>
												${tier.yearlyPrice} billed annually
											</p>
										</div>

										<div className='space-y-3'>
											{tier.features.map((feature) => (
												<div className='flex items-start gap-2' key={feature}>
													<Check
														aria-hidden='true'
														className='mt-0.5 h-4 w-4 shrink-0 text-success-500'
													/>
													<span className='text-sm leading-6 text-text-primary'>
														{feature}
													</span>
												</div>
											))}
											{tier.limitations?.map((limitation) => (
												<div
													className='flex items-start gap-2'
													key={limitation}
												>
													<X
														aria-hidden='true'
														className='mt-0.5 h-4 w-4 shrink-0 text-text-disabled'
													/>
													<span className='text-sm leading-6 text-text-disabled'>
														{limitation}
													</span>
												</div>
											))}
										</div>

										<a
											href={
												tier.id === 'free'
													? '/dashboard'
													: '/auth/sign-up?plan=pro'
											}
											className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
												tier.recommended
													? 'bg-white text-neutral-900 shadow-[0_12px_30px_rgba(255,255,255,0.14)] hover:shadow-[0_18px_36px_rgba(255,255,255,0.18)]'
													: 'border border-white/10 bg-white/[0.04] text-text-primary hover:bg-white/[0.08]'
											}`}
										>
											{tier.ctaText}
										</a>
									</motion.div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
