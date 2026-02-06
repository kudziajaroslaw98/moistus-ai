'use client';

import { Brain, Keyboard, Radio, Zap } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const badges = [
	{ label: 'AI-native', icon: Brain },
	{ label: 'Keyboard-first', icon: Keyboard },
	{ label: 'Real-time sync', icon: Radio },
	{ label: 'Built for power users', icon: Zap },
];

export function TrustStrip() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-10% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<div
			ref={ref}
			className='relative py-12 px-4 sm:px-6 lg:px-8 bg-background'
		>
			<div className='max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 sm:gap-4'>
				{badges.map((badge, i) => {
					const Icon = badge.icon;
					return (
						<motion.span
							key={badge.label}
							initial={
								shouldReduceMotion
									? { opacity: 1, y: 0 }
									: { opacity: 0, y: 10 }
							}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={
								shouldReduceMotion
									? { duration: 0 }
									: { duration: 0.3, ease: EASE_OUT_QUART, delay: i * 0.08 }
							}
							className='inline-flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 rounded-full border border-white/8 bg-white/[0.03]'
						>
							<Icon aria-hidden='true' className='h-3.5 w-3.5' />
							{badge.label}
						</motion.span>
					);
				})}
			</div>
		</div>
	);
}
