'use client';

import { Check, X } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { GrainOverlay } from './grain-overlay';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const pains = [
	'Tools that fight your thinking flow',
	'AI hidden behind complex workflows',
	'Collaboration that feels laggy',
	'Buried behind menus and clicks',
];

const solutions = [
	'Ideas flow, connections form naturally',
	'AI on tap — one click, instant insight',
	'Real-time sync, zero friction',
	'Keyboard-first, everything instant',
];

const ITEM_STAGGER = 0.08;

export function ProblemSolution() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section
			id='problem'
			ref={ref}
			className='relative py-20 px-4 sm:px-6 lg:px-8 bg-background'
		>
			<GrainOverlay />
			<SectionDecoration variant='problem' />
			<div className='relative z-10 max-w-3xl mx-auto'>
				{/* Headline */}
				<motion.h2
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
					}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.5, ease: EASE_OUT_QUART }
					}
					className='font-lora text-2xl sm:text-3xl md:text-4xl font-bold text-center text-text-primary leading-snug tracking-tight mb-14'
				>
					You shouldn&apos;t have to{' '}
					<span className='text-brand-coral'>fight</span> your tools to think.
				</motion.h2>

				{/* Without / With Shiko split */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0'>
					{/* Without Shiko column */}
					<motion.div
						initial={
							shouldReduceMotion
								? { opacity: 1, y: 0 }
								: { opacity: 0, y: 12 }
						}
						animate={isInView ? { opacity: 1, y: 0 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.3, ease: EASE_OUT_QUART }
						}
						className='md:border-r md:border-white/[0.06] md:pr-10'
					>
						<p className='text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-6'>
							Without Shiko
						</p>
						<ul className='space-y-4'>
							{pains.map((pain, i) => (
								<motion.li
									key={pain}
									initial={
										shouldReduceMotion
											? { opacity: 1, y: 0 }
											: { opacity: 0, y: 8 }
									}
									animate={isInView ? { opacity: 1, y: 0 } : {}}
									transition={
										shouldReduceMotion
											? { duration: 0 }
											: {
													duration: 0.3,
													ease: EASE_OUT_QUART,
													delay: i * ITEM_STAGGER,
												}
									}
									className='flex items-start gap-2.5'
								>
									<X
										aria-hidden='true'
										className='h-4 w-4 mt-0.5 shrink-0 text-brand-coral/60'
									/>
									<span className='text-base sm:text-lg text-text-tertiary'>
										{pain}
									</span>
								</motion.li>
							))}
						</ul>
					</motion.div>

					{/* With Shiko column */}
					<motion.div
						initial={
							shouldReduceMotion
								? { opacity: 1, y: 0 }
								: { opacity: 0, y: 12 }
						}
						animate={isInView ? { opacity: 1, y: 0 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.3, ease: EASE_OUT_QUART, delay: 0.3 }
						}
						className='md:pl-10'
					>
						<p className='text-xs font-semibold uppercase tracking-widest text-primary-400/70 mb-6'>
							With Shiko
						</p>
						<ul className='space-y-4'>
							{solutions.map((solution, i) => (
								<motion.li
									key={solution}
									initial={
										shouldReduceMotion
											? { opacity: 1, y: 0 }
											: { opacity: 0, y: 8 }
									}
									animate={isInView ? { opacity: 1, y: 0 } : {}}
									transition={
										shouldReduceMotion
											? { duration: 0 }
											: {
													duration: 0.3,
													ease: EASE_OUT_QUART,
													delay: 0.3 + i * ITEM_STAGGER,
												}
									}
									className='flex items-start gap-2.5'
								>
									<Check
										aria-hidden='true'
										className='h-4 w-4 mt-0.5 shrink-0 text-primary-400/70'
									/>
									<span className='text-base sm:text-lg text-text-primary'>
										{solution}
									</span>
								</motion.li>
							))}
						</ul>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
