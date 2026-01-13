'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import {
	motion,
	useReducedMotion,
	useScroll,
	useTransform,
} from 'motion/react';

/**
 * BackgroundEffects creates the landing page's ambient background with:
 * - Grid overlay (static anchor layer)
 * - Decorative tilted glass panels with parallax
 * - Vignette overlay for depth
 *
 * Performance: Uses only transform/opacity animations (GPU composited)
 * Accessibility: All effects disabled when prefers-reduced-motion is set
 * Mobile: Parallax disabled for performance
 */
export default function BackgroundEffects() {
	const shouldReduceMotion = useReducedMotion();
	const isMobile = useIsMobile();
	const { scrollY } = useScroll();

	// Disable parallax on mobile or reduced motion
	const parallaxEnabled = !isMobile && !shouldReduceMotion;

	// Parallax transforms - different speeds create depth perception
	// Slow = far away, Fast = close to viewer
	const slowY = useTransform(
		scrollY,
		[0, 3000],
		parallaxEnabled ? [0, 100] : [0, 0]
	);
	const mediumY = useTransform(
		scrollY,
		[0, 3000],
		parallaxEnabled ? [0, 200] : [0, 0]
	);
	const fastY = useTransform(
		scrollY,
		[0, 3000],
		parallaxEnabled ? [0, 300] : [0, 0]
	);

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

	// Panel animations - use static final state when reduced motion is preferred
	const panelTransition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.8, ease: 'easeOut' as const };

	return (
		<div className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
			{/* Grid pattern overlay - anchor layer (no parallax) */}
			<div
				className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-80"
				style={{ backgroundSize: '50px 50px' }}
			/>

			{/* Decorative glass panels for bold visual interest */}
			<div className='absolute inset-0'>
				{/* Top right tilted panel (medium parallax) */}
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
						y: mediumY,
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
						border: '1px solid rgba(255, 255, 255, 0.06)',
						backdropFilter: 'blur(8px)',
					}}
				/>

				{/* Bottom left tilted panel (slow parallax) */}
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
						y: slowY,
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.008) 100%)',
						border: '1px solid rgba(255, 255, 255, 0.04)',
						backdropFilter: 'blur(4px)',
					}}
				/>

				{/* Small accent panel - mid left (fast parallax - appears closest) */}
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
						y: fastY,
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
