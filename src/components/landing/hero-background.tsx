'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Hero-specific background effects with glassmorphism panels.
 * Only visible in the hero section - other sections cover it with solid backgrounds.
 */
export function HeroBackground() {
	const shouldReduceMotion = useReducedMotion();

	// Breathing animation for center blob
	const breathingAnimation = shouldReduceMotion
		? { opacity: 0.5, scale: 1 }
		: {
				opacity: [0.4, 0.6, 0.4],
				scale: [1, 1.08, 1],
			};

	const breathingTransition = shouldReduceMotion
		? { duration: 0 }
		: {
				duration: 8,
				ease: 'easeInOut' as const,
				repeat: Infinity,
			};

	// Panel animations
	const panelTransition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.8, ease: 'easeOut' as const };

	return (
		<div className='absolute inset-0 overflow-hidden pointer-events-none'>
			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-80"
				style={{ backgroundSize: '50px 50px' }}
			/>

			{/* Glassmorphism gradient backdrop */}
			<div className='absolute inset-0'>
				{/* Accent glow - center with breathing animation */}
				{/*<motion.div
					className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]'
					animate={breathingAnimation}
					transition={breathingTransition}
					style={{
						background:
							'radial-gradient(circle, rgba(96, 165, 250, 0.06) 0%, rgba(56, 189, 248, 0.02) 40%, transparent 60%)',
						filter: 'blur(40px)',
					}}
				/>*/}
			</div>

			{/* Decorative glass panels */}
			<div className='absolute inset-0'>
				{/* Top right tilted panel */}
				<motion.div
					className='absolute top-16 right-[12%] w-72 h-72 rounded-3xl'
					initial={
						shouldReduceMotion
							? { opacity: 1, rotate: 12 }
							: { opacity: 0, rotate: 8 }
					}
					animate={{ opacity: 1, rotate: 12 }}
					transition={{
						...panelTransition,
						delay: shouldReduceMotion ? 0 : 0.3,
					}}
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
						border: '1px solid rgba(255, 255, 255, 0.06)',
						backdropFilter: 'blur(8px)',
					}}
				/>

				{/* Bottom left tilted panel */}
				<motion.div
					className='absolute bottom-24 left-[8%] w-56 h-56 rounded-2xl'
					initial={
						shouldReduceMotion
							? { opacity: 1, rotate: -6 }
							: { opacity: 0, rotate: -2 }
					}
					animate={{ opacity: 1, rotate: -6 }}
					transition={{
						...panelTransition,
						delay: shouldReduceMotion ? 0 : 0.5,
					}}
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.008) 100%)',
						border: '1px solid rgba(255, 255, 255, 0.04)',
						backdropFilter: 'blur(4px)',
					}}
				/>

				{/* Small accent panel - mid left */}
				<motion.div
					className='absolute top-1/3 left-[5%] w-32 h-32 rounded-xl'
					initial={
						shouldReduceMotion
							? { opacity: 1, rotate: 18 }
							: { opacity: 0, rotate: 15 }
					}
					animate={{ opacity: 1, rotate: 18 }}
					transition={{
						...panelTransition,
						delay: shouldReduceMotion ? 0 : 0.7,
					}}
					style={{
						background:
							'linear-gradient(135deg, rgba(96, 165, 250, 0.04) 0%, rgba(96, 165, 250, 0.01) 100%)',
						border: '1px solid rgba(96, 165, 250, 0.08)',
						backdropFilter: 'blur(4px)',
					}}
				/>
			</div>

			{/* Vignette overlay for depth */}
			<div
				className='absolute inset-0'
				style={{
					background:
						'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(9, 9, 11, 0.6) 80%, rgba(9, 9, 11, 0.7) 100%)',
				}}
			/>
		</div>
	);
}
