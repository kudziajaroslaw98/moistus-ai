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
			className='relative py-24 px-4 sm:px-6 lg:px-8'
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

				{/* Steps with timeline */}
				<div className='space-y-0'>
					{steps.map((step, index) => {
						const Icon = step.icon;
						const isLast = index === steps.length - 1;
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
								className='flex items-stretch gap-5 md:gap-7'
							>
								{/* Timeline column */}
								<div className='flex flex-col items-center shrink-0 pt-7 md:pt-9'>
									{/* Dot */}
									<div className='relative shrink-0'>
										<div className='w-3 h-3 rounded-full bg-primary-500/40' />
										<div className='absolute inset-0 w-3 h-3 rounded-full bg-primary-500/20 animate-[node-pulse_3s_ease-in-out_infinite]' style={{ animationDelay: `${index * 0.5}s` }} />
									</div>
									{/* Connector line */}
									{!isLast && (
										<div className='w-px flex-1 mt-1 bg-gradient-to-b from-primary-500/20 to-primary-500/5' />
									)}
								</div>

								{/* Card */}
								<div className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
									<div className='rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8 transition-[border-color,transform] duration-200 hover:border-primary-500/15 hover:-translate-y-0.5'>
										<div className='flex gap-6 md:gap-8 items-start'>
											{/* Number */}
											<span
												className='shrink-0 font-lora text-4xl md:text-5xl font-bold leading-none select-none text-primary-500/15'
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
										</div>
									</div>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
