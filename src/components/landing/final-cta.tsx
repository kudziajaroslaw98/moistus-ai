'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function FinalCta() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section
			ref={ref}
			className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
		>
			{/* Gradient background */}
			<div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 to-transparent" />

			<motion.div
				initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT_QUART }}
				className="relative max-w-2xl mx-auto text-center"
			>
				<h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
					Ready to connect your ideas?
				</h2>
				<p className="text-lg text-text-secondary mb-8">
					Start free. No credit card required.
				</p>
				<a
					href="/try"
					className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold rounded-md bg-primary-600 hover:bg-primary-500 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(96,165,250,0.3)]"
				>
					Try Free
				</a>
			</motion.div>
		</section>
	);
}
