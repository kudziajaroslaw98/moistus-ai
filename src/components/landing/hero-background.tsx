'use client';

import { GrainGradient } from '@paper-design/shaders-react';
import { useReducedMotion } from 'motion/react';

/**
 * Hero background with GrainGradient shader.
 * Warm coral-to-blue gradient with grain texture, overlaid on
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

			{/* GrainGradient shader */}
			<div className='absolute inset-0'>
				<GrainGradient
					colors={['#7300ff', '#eba8ff', '#00bfff', '#2a00ff']}
					colorBack='#0a0a0b'
					softness={0.5}
					intensity={0.4}
					noise={0.3}
					shape='corners'
					speed={shouldReduceMotion ? 0 : 0.3}
					scale={1}
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
