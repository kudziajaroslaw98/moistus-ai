'use client';

import { motion } from 'motion/react';

export default function MinimalFooter() {
	const currentYear = new Date().getFullYear();

	return (
		<motion.footer
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5, delay: 0.8 }}
			className='relative z-10 mt-auto w-full'
		>
			<div className='flex items-center w-full justify-center py-8 gap-4 text-sm text-zinc-500'>
				{/* Copyright */}
				<div className='flex items-center gap-1'>
					<span>© {currentYear}</span>

					<span className='text-zinc-600'>•</span>

					<span>Moistus AI</span>
				</div>
			</div>
		</motion.footer>
	);
}
