'use client';

import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

interface AuthCardProps {
	children: ReactNode;
	className?: string;
	title?: string;
	subtitle?: string;
}

const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

const glassmorphismStyle = {
	background:
		'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
	border: '1px solid rgba(255, 255, 255, 0.08)',
	backdropFilter: 'blur(12px)',
	WebkitBackdropFilter: 'blur(12px)',
};

export function AuthCard({
	children,
	className,
	title,
	subtitle,
}: AuthCardProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			className={cn('p-8 rounded-2xl', className)}
			style={glassmorphismStyle}
			initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: { duration: 0.3, delay: 0.1, ease: easeOutQuart }
			}
		>
			{title && (
				<motion.h1
					className='text-2xl font-bold text-center text-white mb-2'
					initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.25, delay: 0.15, ease: easeOutQuart }
					}
				>
					{title}
				</motion.h1>
			)}

			{subtitle && (
				<motion.p
					className='text-text-secondary text-center mb-6'
					initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.25, delay: 0.2, ease: easeOutQuart }
					}
				>
					{subtitle}
				</motion.p>
			)}

			{children}
		</motion.div>
	);
}
