'use client';

import { motion } from 'motion/react';

export default function BackgroundEffects() {
	return (
		<div className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-90"
				style={{ backgroundSize: '50px 50px' }}
			/>

			{/* Floating gradient orbs */}
			<div className='absolute inset-0'>
				{/* Primary orb - violet/purple */}
				<motion.div
					animate={{
						x: [0, 30, -140, 0],
						y: [0, -100, 30, 0],
						scale: [1, 1.5, 0.9, 1],
					}}
					transition={{
						duration: 10,
						ease: 'easeInOut',
						repeat: Infinity,
						repeatType: 'loop',
					}}
					className='absolute top-1/4 left-1/4 w-[500px] h-[500px]'
				>
					<div className='w-full h-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-full blur-3xl' />
				</motion.div>

				{/* Secondary orb - blue/indigo */}
				<motion.div
					animate={{
						x: [0, -120, 40, 0],
						y: [0, 40, -160, 0],
						scale: [1, 0.95, 1.2, 1],
					}}
					transition={{
						duration: 10,
						ease: 'easeInOut',
						repeat: Infinity,
						repeatType: 'loop',
					}}
					className='absolute bottom-1/4 right-1/4 w-[600px] h-[600px]'
				>
					<div className='w-full h-full bg-gradient-to-br from-blue-500/15 to-indigo-600/15 rounded-full blur-3xl' />
				</motion.div>

				{/* Accent orb - smaller, emerald */}
				<motion.div
					animate={{
						x: [0, 100, -100, 0],
						y: [0, -200, 120, 0],
						scale: [1.4, 1.2, 0.9, 1],
					}}
					transition={{
						duration: 10,
						ease: 'easeInOut',
						repeat: Infinity,
						repeatType: 'loop',
					}}
					className='absolute top-1/2 right-1/3 w-[300px] h-[300px]'
				>
					<div className='w-full h-full bg-gradient-to-br from-emerald-500/10 to-teal-600/10 rounded-full blur-3xl' />
				</motion.div>
			</div>

			{/* Vignette overlay for depth perception */}
			<div className='absolute inset-0 bg-radial-gradient from-transparent via-transparent to-zinc-900/70 ' />
		</div>
	);
}
