'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface RevealProps {
	children: ReactNode;
	className?: string;
	delay?: number;
}

/** One-shot fade-up when scrolled into view; renders static for reduced motion. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
	const shouldReduceMotion = useReducedMotion() ?? false;

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 18 }}
			transition={{ duration: 0.45, ease: EASE_OUT_QUART, delay }}
			viewport={{ once: true, margin: '-12% 0px' }}
			whileInView={{ opacity: 1, y: 0 }}
		>
			{children}
		</motion.div>
	);
}
