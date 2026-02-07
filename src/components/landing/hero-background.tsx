'use client';

import { GrainGradient } from '@paper-design/shaders-react';
import { useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

/**
 * Hero background with GrainGradient shader.
 * Unmounts the WebGL canvas when scrolled out of view to prevent
 * GPU drain and scroll lag. Remounts early via rootMargin.
 */
export function HeroBackground() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { margin: '200px 0px' });
	const shouldReduceMotion = useReducedMotion();

	return (
		<div
			ref={ref}
			className='absolute inset-0 overflow-hidden pointer-events-none'
		>
			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-80"
				style={{ backgroundSize: '50px 50px' }}
			/>

			{/* GrainGradient shader — unmounted when offscreen */}
			{isInView && (
				<div className='absolute inset-0'>
					<GrainGradient
						colors={['#7300ff', '#eba8ff', '#00bfff', '#2a00ff']}
						colorBack='#060606'
						softness={0.5}
						intensity={0.4}
						noise={0.3}
						frame={7000}
						shape='corners'
						speed={shouldReduceMotion ? 0 : 0.3}
						scale={1}
						style={{ width: '100%', height: '100%' }}
					/>
				</div>
			)}

			{/* Vignette overlay for depth */}
			<div
				className='absolute inset-0'
				style={{
					background:
						'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(5, 5, 6, 0.6) 80%, rgba(5, 5, 6, 0.7) 100%)',
				}}
			/>
		</div>
	);
}
