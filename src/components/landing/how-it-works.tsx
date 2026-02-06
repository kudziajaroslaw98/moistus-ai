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
					className='text-center mb-16'
				>
					<h2 className='font-lora text-3xl md:text-4xl font-bold text-text-primary mb-4'>
						How It Works
					</h2>
					<p className='text-lg text-text-secondary'>
						From first thought to connected knowledge in three steps
					</p>
				</motion.div>

				{/* Vertical timeline */}
				<div className='relative'>
					{/* Connecting line (desktop) */}
					<div
						className='hidden md:block absolute left-8 top-0 bottom-0 w-px'
						style={{
							background:
								'linear-gradient(180deg, transparent, rgba(96, 165, 250, 0.2) 10%, rgba(96, 165, 250, 0.2) 90%, transparent)',
						}}
					/>

					<div className='space-y-12 md:space-y-16'>
						{steps.map((step, index) => {
							const Icon = step.icon;
							return (
								<motion.div
									key={step.title}
									initial={
										shouldReduceMotion
											? { opacity: 1, y: 0 }
											: { opacity: 0, y: 20 }
									}
									animate={isInView ? { opacity: 1, y: 0 } : {}}
									transition={
										shouldReduceMotion
											? { duration: 0 }
											: {
													duration: 0.3,
													ease: EASE_OUT_QUART,
													delay: index * 0.15,
												}
									}
									className='relative md:pl-24'
								>
									{/* Large typographic number */}
									<span
										className='hidden md:block absolute left-0 top-0 font-lora text-5xl lg:text-6xl font-bold leading-none select-none text-brand-coral/15'
										aria-hidden='true'
									>
										{step.number}
									</span>

									{/* Content */}
									<div>
										<div className='flex items-center gap-3 mb-2'>
											<Icon
												aria-hidden='true'
												className='h-5 w-5 text-primary-400'
											/>
											<h3 className='text-xl font-semibold text-text-primary'>
												{step.title}
											</h3>
										</div>
										<p className='text-text-secondary leading-relaxed max-w-xl'>
											{step.description}
										</p>
									</div>
								</motion.div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
