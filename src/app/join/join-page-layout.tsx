'use client';

import BackgroundEffects from '@/components/waitlist/background-effects';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface JoinPageLayoutProps {
	children: ReactNode;
}

export function JoinPageLayout({ children }: JoinPageLayoutProps) {
	return (
		<main className='relative min-h-screen flex flex-col bg-zinc-950'>
			<BackgroundEffects />

			{/* Header with logo */}
			<header className='relative z-20 pt-8 px-4'>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='flex justify-center'
					initial={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
				>
					<Link className='group' href='/'>
						<Image
							alt='Moistus Logo'
							className='transition-transform duration-200 group-hover:scale-105'
							height={60}
							src='/images/moistus.svg'
							width={60}
						/>
					</Link>
				</motion.div>
			</header>

			{/* Main content */}
			<section className='flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative z-20'>
				<div className='w-full max-w-md mx-auto'>{children}</div>
			</section>

			{/* Minimal footer */}
			<footer className='relative z-20 pb-8 px-4'>
				<motion.p
					animate={{ opacity: 1 }}
					className='text-center text-xs text-zinc-500'
					initial={{ opacity: 0 }}
					transition={{ delay: 0.5, duration: 0.3 }}
				>
					By joining, you agree to our{' '}
					<Link
						className='text-zinc-400 hover:text-zinc-300 underline underline-offset-2 transition-colors'
						href='/terms'
					>
						Terms
					</Link>{' '}
					and{' '}
					<Link
						className='text-zinc-400 hover:text-zinc-300 underline underline-offset-2 transition-colors'
						href='/privacy'
					>
						Privacy Policy
					</Link>
				</motion.p>
			</footer>
		</main>
	);
}
