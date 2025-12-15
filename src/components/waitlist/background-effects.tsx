'use client';

import { motion, useReducedMotion } from 'motion/react';

export default function BackgroundEffects() {
	const shouldReduceMotion = useReducedMotion();

	// Static values for reduced motion - preserve visual appearance without animation
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

	// Panel animations - use static final state when reduced motion is preferred
	const panelTransition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.8, ease: 'easeOut' as const };

	return (
		<div className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-80"
				style={{ backgroundSize: '50px 50px' }}
			/>

			{/* Glassmorphism gradient backdrop */}
			<div className='absolute inset-0'>
				{/* Primary gradient panel - top right (blue) */}
				<div
					className='absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full'
					style={{
						background:
							'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, rgba(96, 165, 250, 0.04) 40%, transparent 70%)',
						filter: 'blur(60px)',
					}}
				/>

				{/* Secondary gradient panel - bottom left (teal) */}
				<div
					className='absolute -bottom-1/4 -left-1/4 w-[700px] h-[700px] rounded-full'
					style={{
						background:
							'radial-gradient(circle, rgba(20, 184, 166, 0.1) 0%, rgba(20, 184, 166, 0.03) 40%, transparent 70%)',
						filter: 'blur(60px)',
					}}
				/>

				{/* Accent glow - center with breathing animation */}
				<motion.div
					className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]'
					animate={breathingAnimation}
					transition={breathingTransition}
					style={{
						background:
							'radial-gradient(circle, rgba(96, 165, 250, 0.06) 0%, rgba(56, 189, 248, 0.02) 40%, transparent 60%)',
						filter: 'blur(40px)',
					}}
				/>
			</div>

			{/* Decorative glass panels for bold visual interest */}
			<div className='absolute inset-0'>
				{/* Top right tilted panel */}
				<motion.div
					className='absolute top-16 right-[12%] w-72 h-72 rounded-3xl'
					initial={shouldReduceMotion ? { opacity: 1, rotate: 12 } : { opacity: 0, rotate: 8 }}
					animate={{ opacity: 1, rotate: 12 }}
					transition={{ ...panelTransition, delay: shouldReduceMotion ? 0 : 0.3 }}
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
					initial={shouldReduceMotion ? { opacity: 1, rotate: -6 } : { opacity: 0, rotate: -2 }}
					animate={{ opacity: 1, rotate: -6 }}
					transition={{ ...panelTransition, delay: shouldReduceMotion ? 0 : 0.5 }}
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
					initial={shouldReduceMotion ? { opacity: 1, rotate: 18 } : { opacity: 0, rotate: 15 }}
					animate={{ opacity: 1, rotate: 18 }}
					transition={{ ...panelTransition, delay: shouldReduceMotion ? 0 : 0.7 }}
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
						'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(9, 9, 11, 0.6) 80%, rgba(9, 9, 11, 0.9) 100%)',
				}}
			/>
		</div>
	);
}
