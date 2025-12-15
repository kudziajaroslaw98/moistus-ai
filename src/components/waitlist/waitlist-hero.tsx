'use client';
import { motion } from 'motion/react';

export function WaitlistHero() {
	return (
		<div className='mx-auto max-w-4xl'>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='text-4xl font-bold flex flex-col tracking-tight text-white sm:text-5xl md:text-6xl'
				initial={{ opacity: 0, y: 40 }}
				transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
			>
				<span className='whitespace-nowrap'>
					From <span className='text-teal-400'>Scattered Notes</span>
				</span>

				<span>
					to <span className='text-sky-400'>Connected Ideas</span>.
				</span>
			</motion.div>

			<motion.p
				animate={{ opacity: 1, y: 0 }}
				className='mt-6 text-lg leading-relaxed text-zinc-300'
				initial={{ opacity: 0, y: 20 }}
				transition={{ delay: 0.15, duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
			>
				Moistus AI is the intelligent mind-mapping platform that organizes your
				chaos. We don’t just store ideas — we connect them, revealing insights
				you never knew you had.
			</motion.p>
		</div>
	);
}
