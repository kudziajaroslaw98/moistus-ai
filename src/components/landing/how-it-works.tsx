'use client';

import { Keyboard, PlusCircle, Sparkles } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const steps = [
	{
		number: '01',
		icon: PlusCircle,
		title: 'Start a map',
		description:
			'Create a new mind map or try free without signing up. Your canvas is ready in seconds.',
	},
	{
		number: '02',
		icon: Keyboard,
		title: 'Capture your thoughts',
		description:
			'Type naturally. Use commands to structure. The editor parses #tags, $types, and @mentions as you go.',
	},
	{
		number: '03',
		icon: Sparkles,
		title: 'Let AI connect the dots',
		description:
			'Ghost nodes suggest links you missed. Your scattered notes become a connected knowledge web.',
	},
];

export function HowItWorks() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section
			id='how-it-works'
			ref={ref}
			className='relative py-24 px-4 sm:px-6 lg:px-8 bg-surface/50'
		>
			<SectionDecoration variant='howItWorks' />
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
					className='text-center mb-14'
				>
					<h2 className='font-lora text-3xl md:text-4xl font-bold text-text-primary mb-4'>
						How It Works
					</h2>
					<p className='text-lg text-text-secondary'>
						From first thought to connected knowledge in three steps
					</p>
				</motion.div>

				{/* Steps */}
				<div className='space-y-6'>
					{steps.map((step, index) => {
						const Icon = step.icon;
						return (
							<motion.div
								key={step.title}
								initial={
									shouldReduceMotion
										? { opacity: 1, y: 0 }
										: { opacity: 0, y: 16 }
								}
								animate={isInView ? { opacity: 1, y: 0 } : {}}
								transition={
									shouldReduceMotion
										? { duration: 0 }
										: {
												duration: 0.3,
												ease: EASE_OUT_QUART,
												delay: index * 0.12,
											}
								}
								className='relative flex gap-6 md:gap-8 items-start rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8'
							>
								{/* Number */}
								<span
									className='shrink-0 font-lora text-4xl md:text-5xl font-bold leading-none select-none text-white/10'
									aria-hidden='true'
								>
									{step.number}
								</span>

								{/* Content */}
								<div className='pt-1'>
									<div className='flex items-center gap-2.5 mb-2'>
										<Icon
											aria-hidden='true'
											className='h-4.5 w-4.5 text-primary-400'
										/>
										<h3 className='text-lg font-semibold text-text-primary'>
											{step.title}
										</h3>
									</div>
									<p className='text-text-secondary leading-relaxed'>
										{step.description}
									</p>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
