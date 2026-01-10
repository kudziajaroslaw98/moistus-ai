'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function ProblemSolution() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto">
				<div className="relative grid md:grid-cols-2 gap-12 md:gap-16 items-center">
					{/* Problem */}
					<motion.div
						initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT_QUART }}
						className="text-center md:text-left"
					>
						<p className="text-xl md:text-2xl leading-relaxed text-text-secondary">
							"Mind mapping tools are either{' '}
							<span className="text-text-primary font-medium">too simple</span>{' '}
							or{' '}
							<span className="text-text-primary font-medium">too bloated</span>.
							You end up fighting the tool instead of thinking."
						</p>
					</motion.div>

					{/* Divider (desktop only) */}
					<div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
						<div className="w-px h-16 bg-border-subtle" />
					</div>

					{/* Solution */}
					<motion.div
						initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.3, ease: EASE_OUT_QUART, delay: 0.1 }
						}
						className="text-center md:text-left"
					>
						<p className="text-xl md:text-2xl leading-relaxed text-text-secondary">
							"Moistus gives you{' '}
							<span className="text-primary-400 font-medium">power without complexity</span>.
							AI surfaces connections. The editor stays out of your way."
						</p>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
