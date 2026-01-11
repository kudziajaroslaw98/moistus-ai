'use client';

import { Keyboard, PlusCircle, Sparkles } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const steps = [
	{
		icon: PlusCircle,
		title: 'Start a map',
		description:
			'Create a new mind map or try free without signing up. Your canvas is ready in seconds.',
	},
	{
		icon: Keyboard,
		title: 'Capture your thoughts',
		description:
			'Type naturally. Use commands to structure. The editor parses #tags, $types, and @mentions as you go.',
	},
	{
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
			className='relative py-32 px-4 sm:px-6 lg:px-8 bg-surface/50'
		>
			<SectionDecoration variant='howItWorks' />
			<div className='relative z-10 max-w-5xl mx-auto'>
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
					<h2 className='text-3xl md:text-4xl font-bold text-text-primary mb-4'>
						How It Works
					</h2>
					<p className='text-lg text-text-secondary'>
						From first thought to connected knowledge in three steps
					</p>
				</motion.div>

				{/* Steps */}
				<div className='relative'>
					{/* Connecting line (desktop only) */}
					<div className='hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-border-subtle' />

					<div className='grid md:grid-cols-3 gap-8 md:gap-12'>
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
									className='relative text-center'
								>
									{/* Step number + icon */}
									<div className='relative inline-flex items-center justify-center mb-6'>
										<div className='w-24 h-24 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center'>
											<Icon className='h-10 w-10 text-primary-400' />
										</div>
										<span className='absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary-600 text-text-primary text-sm font-bold flex items-center justify-center'>
											{index + 1}
										</span>
									</div>

									<h3 className='text-xl font-semibold text-text-primary mb-3'>
										{step.title}
									</h3>
									<p className='text-text-secondary leading-relaxed'>
										{step.description}
									</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
