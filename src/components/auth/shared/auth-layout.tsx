'use client';

import BackgroundEffects from '@/components/waitlist/background-effects';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
	children: ReactNode;
}

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

export function AuthLayout({ children }: AuthLayoutProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<main className='relative min-h-screen flex flex-col bg-background'>
			<BackgroundEffects />

			{/* Main content */}
			<section className='flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 relative z-20'>
				<div className='w-full max-w-md mx-auto'>
					{/* Logo */}
					<motion.div
						className='flex justify-center mb-8'
						initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.3, ease: easeOutQuart }
						}
					>
						<Link href='/' className='block'>
							<Image
								alt='Moistus Logo'
								height={80}
								src='/images/moistus.svg'
								width={80}
								priority
							/>
						</Link>
					</motion.div>

					{/* Content */}
					{children}
				</div>
			</section>

			{/* Footer */}
			<motion.footer
				className='relative z-20 py-6 text-center text-sm text-text-tertiary'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.5, duration: 0.3, ease: easeOutQuart }
				}
			>
				<p>&copy; {new Date().getFullYear()} Moistus</p>
			</motion.footer>
		</main>
	);
}
