'use client';

import { NeuroNoise } from '@paper-design/shaders-react';
import { useReducedMotion } from 'motion/react';

/**
 * Hero background with NeuroNoise shader for neural-connection visuals.
 * Subtle grayscale neural web with warm coral mid-tone, overlaid on
 * grid pattern with vignette. Stops animation for reduced-motion.
 */
export function HeroBackground() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<div className='absolute inset-0 overflow-hidden pointer-events-none'>
			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-80"
				style={{ backgroundSize: '50px 50px' }}
			/>

			{/* NeuroNoise shader */}
			<div className='absolute inset-0 opacity-40'>
				<NeuroNoise
					colorFront='#2a2a2a'
					colorMid='#1a1a1a'
					colorBack='#0a0a0b'
					brightness={0.4}
					contrast={0.3}
					speed={shouldReduceMotion ? 0 : 0.4}
					scale={1.2}
					style={{ width: '100%', height: '100%' }}
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
