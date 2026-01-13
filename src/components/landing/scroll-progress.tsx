'use client';

import { motion, useScroll, useSpring, useReducedMotion } from 'motion/react';

export function ScrollProgress() {
	const { scrollYProgress } = useScroll();
	const shouldReduceMotion = useReducedMotion() ?? false;

	// Smooth spring animation for progress (skip if reduced motion)
	const scaleX = useSpring(scrollYProgress, {
		stiffness: 100,
		damping: 30,
		restDelta: 0.001,
	});

	return (
		<motion.div
			className='fixed top-0 left-0 right-0 h-0.5 bg-primary-500 z-[60] origin-left'
			style={{
				scaleX: shouldReduceMotion ? scrollYProgress : scaleX,
			}}
		/>
	);
}
