'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { GrainOverlay } from './grain-overlay';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const beforeItems = [
	'Tools that fight your thinking flow',
	'AI bolted on as an afterthought',
	'Collaboration that feels laggy',
	'Buried behind menus and clicks',
];

const afterItems = [
	'Ideas flow, connections form naturally',
	'AI suggestions appear as you work',
	'Real-time sync, zero friction',
	'Keyboard-first, everything instant',
];

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
			<div className='relative z-10 max-w-4xl mx-auto'>
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
					className='font-lora text-2xl sm:text-3xl md:text-4xl font-bold text-center text-text-primary leading-snug tracking-tight mb-12'
				>
					You shouldn&apos;t have to{' '}
					<span className='text-brand-coral'>fight</span> your tools
					to think.
				</motion.h2>

				{/* Before / After grid */}
				<div className='grid md:grid-cols-2 gap-6'>
					{/* Before column */}
					<motion.div
						initial={
							shouldReduceMotion
								? { opacity: 1, x: 0 }
								: { opacity: 0, x: -12 }
						}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.4, ease: EASE_OUT_QUART, delay: 0.1 }
						}
						className='rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8'
					>
						<p className='text-xs font-semibold text-brand-coral/70 uppercase tracking-widest mb-5'>
							Before
						</p>
						<ul className='space-y-3.5'>
							{beforeItems.map((item) => (
								<li
									key={item}
									className='flex items-start gap-3 text-sm text-text-secondary'
								>
									<span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-coral/50' />
									{item}
								</li>
							))}
						</ul>
					</motion.div>

					{/* After column */}
					<motion.div
						initial={
							shouldReduceMotion
								? { opacity: 1, x: 0 }
								: { opacity: 0, x: 12 }
						}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.4, ease: EASE_OUT_QUART, delay: 0.2 }
						}
						className='rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8'
					>
						<p className='text-xs font-semibold text-primary-400/70 uppercase tracking-widest mb-5'>
							After
						</p>
						<ul className='space-y-3.5'>
							{afterItems.map((item) => (
								<li
									key={item}
									className='flex items-start gap-3 text-sm text-text-secondary'
								>
									<span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400/50' />
									{item}
								</li>
							))}
						</ul>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
