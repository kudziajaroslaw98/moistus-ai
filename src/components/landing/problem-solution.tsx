'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function ProblemSolution() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section
			id='problem'
			ref={ref}
			className='relative py-32 px-4 sm:px-6 lg:px-8 bg-background'
		>
			<SectionDecoration variant='problem' />
			<div className='relative z-10 max-w-3xl mx-auto text-center'>
				{/* Main statement */}
				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
					}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.5, ease: EASE_OUT_QUART }
					}
				>
					<p className='text-xl sm:text-2xl md:text-3xl font-light text-text-secondary leading-snug tracking-tight'>
						Mind mapping tools are either{' '}
						<span className='font-semibold text-text-primary'>too simple</span>{' '}
						or{' '}
						<span className='font-semibold text-text-primary'>too bloated</span>
					</p>

					{/* Subtle accent line */}
					<motion.div
						className='mt-6 mx-auto w-12 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent'
						initial={
							shouldReduceMotion
								? { opacity: 1, scaleX: 1 }
								: { opacity: 0, scaleX: 0 }
						}
						animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.4, ease: EASE_OUT_QUART, delay: 0.2 }
						}
					/>

					{/* Supporting text */}
					<motion.p
						className='mt-4 text-base sm:text-lg text-text-tertiary'
						initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
						animate={isInView ? { opacity: 1 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.4, ease: EASE_OUT_QUART, delay: 0.3 }
						}
					>
						You end up fighting the tool instead of thinking.
					</motion.p>
				</motion.div>
			</div>
		</section>
	);
}
