'use client';

import { PRICING_TIERS } from '@/constants/pricing-tiers';
import { getProSignupHref } from '@/helpers/subscription/checkout-intent';
import { cn } from '@/utils/cn';
import { Check, Download, Lock, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from './reveal';
import { StartMappingLink } from './start-mapping-link';

type BillingCycle = 'monthly' | 'yearly';

const PRO_TIER = PRICING_TIERS.find((tier) => tier.id === 'pro');
const PRO_YEARLY_EFFECTIVE_MONTHLY =
	PRO_TIER && PRO_TIER.yearlyPrice > 0 ? PRO_TIER.yearlyPrice / 12 : 0;
const PRO_YEARLY_SAVINGS_PERCENT =
	PRO_TIER && PRO_TIER.monthlyPrice > 0
		? Math.round(
				100 * (1 - PRO_YEARLY_EFFECTIVE_MONTHLY / PRO_TIER.monthlyPrice)
			)
		: 0;

const trustPoints = [
	{ icon: Lock, label: 'Private by default: only people you invite see a map' },
	{ icon: ShieldCheck, label: 'Your maps are never used to train AI' },
	{ icon: Download, label: 'Export everything, anytime' },
] as const;

function formatPrice(price: number): string {
	if (Number.isInteger(price)) {
		return price.toString();
	}

	return price
		.toFixed(2)
		.replace(/\.00$/, '')
		.replace(/(\.\d)0$/, '$1');
}

function BillingToggle({
	value,
	onChange,
}: {
	value: BillingCycle;
	onChange: (cycle: BillingCycle) => void;
}) {
	const optionClass = (selected: boolean) =>
		cn(
			'h-10 cursor-pointer rounded-full px-[18px] text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
			selected
				? 'bg-[#1c1c1f] text-text-primary'
				: 'bg-transparent text-text-secondary hover:text-text-primary'
		);

	return (
		<div
			aria-label='Billing cycle'
			className='inline-flex gap-1 rounded-full border border-white/8 bg-[#0e0e10] p-1'
			role='group'
		>
			<button
				aria-pressed={value === 'monthly'}
				className={optionClass(value === 'monthly')}
				onClick={() => onChange('monthly')}
				type='button'
			>
				Monthly
			</button>

			<button
				aria-pressed={value === 'yearly'}
				className={optionClass(value === 'yearly')}
				onClick={() => onChange('yearly')}
				type='button'
			>
				Yearly
				<span className='ml-1.5 text-success-500'>
					−{PRO_YEARLY_SAVINGS_PERCENT}%
				</span>
			</button>
		</div>
	);
}

export function PricingSection() {
	const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

	return (
		<section
			aria-labelledby='pricing-title'
			className='px-6 pt-40 lg:px-8'
			id='pricing'
		>
			<div className='mx-auto max-w-[1200px]'>
				<div className='flex flex-wrap items-end justify-between gap-x-14 gap-y-6'>
					<div>
						<p className='font-mono text-xs uppercase tracking-[0.14em] text-text-tertiary'>
							Pricing
						</p>

						<h2
							className='mt-4 max-w-[16ch] text-balance font-lora text-4xl font-semibold leading-[1.02] tracking-tight md:text-[3.5rem]'
							id='pricing-title'
						>
							Start free. Go Pro when the map outgrows you.
						</h2>
					</div>

					<BillingToggle onChange={setBillingCycle} value={billingCycle} />
				</div>

				<Reveal className='mt-12 grid gap-4 md:grid-cols-2'>
					{PRICING_TIERS.map((tier) => {
						const monthlyEquivalent =
							billingCycle === 'monthly'
								? tier.monthlyPrice
								: tier.yearlyPrice > 0
									? tier.yearlyPrice / 12
									: 0;
						const showYearlyNote =
							billingCycle === 'yearly' && tier.yearlyPrice > 0;

						return (
							<article
								key={tier.id}
								className={cn(
									'relative flex flex-col rounded-[22px] border p-8',
									tier.recommended
										? 'order-first border-[rgba(96,165,250,0.3)] bg-[#0d0f14] md:order-none'
										: 'border-white/8 bg-[#0c0c0e]'
								)}
							>
								<div className='flex items-center justify-between gap-3'>
									<h3 className='text-xl font-semibold'>{tier.name}</h3>

									{tier.recommended ? (
										<span
											aria-label={`${tier.name} plan is recommended`}
											className='rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-900'
											role='status'
										>
											Recommended
										</span>
									) : null}
								</div>

								<p className='mt-1.5 text-[15px] text-text-secondary'>
									{tier.description}
								</p>

								<div className='mt-7 border-b border-white/8 pb-7'>
									<div className='flex items-baseline gap-1.5'>
										<span className='font-lora text-[3.5rem] font-semibold leading-none'>
											${formatPrice(monthlyEquivalent)}
										</span>

										<span className='text-text-tertiary'>/ month</span>
									</div>

									<p
										className={cn(
											'mt-2 h-5 text-[13px] text-text-tertiary',
											!showYearlyNote && 'invisible'
										)}
									>
										${tier.yearlyPrice} billed annually
									</p>
								</div>

								<ul className='mt-7 flex flex-col gap-3 text-[15px]'>
									{tier.features.map((feature) => (
										<li className='flex gap-2.5' key={feature}>
											<Check
												aria-hidden='true'
												className='mt-1 size-[15px] flex-none text-success-500'
												strokeWidth={2.5}
											/>

											{feature}
										</li>
									))}

									{tier.limitations?.map((limitation) => (
										<li
											className='flex gap-2.5 text-text-tertiary'
											key={limitation}
										>
											<X
												aria-hidden='true'
												className='mt-1 size-[15px] flex-none'
												strokeWidth={2.5}
											/>

											{limitation}
										</li>
									))}
								</ul>

								<div className='mt-auto pt-10'>
									<StartMappingLink
										idleLabel={tier.ctaText}
										className={cn(
											'inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-[15px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
											tier.recommended
												? 'bg-white text-neutral-900 shadow-[0_12px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_18px_36px_rgba(255,255,255,0.16)]'
												: 'border border-[#292929] bg-[#141416] text-text-primary hover:bg-[#1a1a1d]'
										)}
										href={
											tier.id === 'free'
												? '/dashboard'
												: getProSignupHref(billingCycle)
										}
									/>
								</div>
							</article>
						);
					})}
				</Reveal>

				<ul className='mt-8 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-text-secondary'>
					{trustPoints.map((point) => (
						<li className='flex items-center gap-2.5' key={point.label}>
							<point.icon
								aria-hidden='true'
								className='size-4 flex-none text-text-tertiary'
							/>

							{point.label}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
