'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Suspense } from 'react';
import { AccessDeniedContent } from './access-denied-content';

// Pulse animation variants for loading state
const pulseVariants = {
	animate: {
		scale: [1, 1.05, 1],
		opacity: [0.5, 0.7, 0.5],
	},
	static: {
		scale: 1,
		opacity: 0.5,
	},
};

// Loading fallback for Suspense boundary
function AccessDeniedLoading() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950'>
			<motion.div
				className='w-48 h-48 rounded-full bg-zinc-800/50'
				variants={pulseVariants}
				animate={shouldReduceMotion ? 'static' : 'animate'}
				transition={
					shouldReduceMotion
						? undefined
						: {
								duration: 2,
								ease: 'easeInOut',
								repeat: Infinity,
							}
				}
			/>
		</div>
	);
}

export default function AccessDeniedPage() {
	return (
		<Suspense fallback={<AccessDeniedLoading />}>
			<AccessDeniedContent />
		</Suspense>
	);
}

// Prevent caching - access state can change
export const dynamic = 'force-dynamic';
