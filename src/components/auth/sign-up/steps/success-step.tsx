'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';

interface SuccessStepProps {
	displayName?: string;
	onComplete: () => void;
}

const AUTO_REDIRECT_DELAY = 3000; // 3 seconds

export function SuccessStep({ displayName, onComplete }: SuccessStepProps) {
	const shouldReduceMotion = useReducedMotion();

	// Auto-redirect after delay
	useEffect(() => {
		const timer = setTimeout(onComplete, AUTO_REDIRECT_DELAY);
		return () => clearTimeout(timer);
	}, [onComplete]);

	const greeting = displayName ? `Welcome, ${displayName}!` : 'Welcome!';

	return (
		<div className='space-y-6 text-center'>
			{/* Success animation */}
			<motion.div
				className='relative'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: {
								type: 'spring',
								stiffness: 200,
								damping: 15,
								duration: 0.5,
							}
				}
			>
				{/* Glow effect */}
				<div className='absolute inset-0 flex items-center justify-center'>
					<motion.div
						className='w-24 h-24 bg-emerald-500/20 rounded-full blur-xl'
						initial={shouldReduceMotion ? { opacity: 0.5 } : { opacity: 0, scale: 0.5 }}
						animate={{ opacity: 0.5, scale: 1.2 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { delay: 0.2, duration: 0.5 }
						}
					/>
				</div>

				{/* Icon */}
				<div className='relative w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto'>
					<CheckCircle2 className='w-10 h-10 text-emerald-400' />
				</div>
			</motion.div>

			{/* Message */}
			<motion.div
				className='space-y-2'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.2, duration: 0.3 }
				}
			>
				<h3 className='text-xl font-semibold text-white'>{greeting}</h3>
				<p className='text-text-secondary'>
					Your account has been created successfully.
				</p>
			</motion.div>

			{/* Benefits hint */}
			<motion.div
				className='flex items-center justify-center gap-2 text-sm text-text-tertiary'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.4, duration: 0.3 }
				}
			>
				<Sparkles className='w-4 h-4 text-primary-400' />
				<span>Start creating your first mind map</span>
			</motion.div>

			{/* CTA Button */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.5, duration: 0.3 }
				}
			>
				<Button
					onClick={onComplete}
					className='w-full h-12 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200'
				>
					Go to Dashboard
					<ArrowRight className='w-4 h-4 ml-2' />
				</Button>
			</motion.div>

			{/* Auto-redirect notice */}
			<motion.p
				className='text-xs text-text-tertiary'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { delay: 0.6, duration: 0.3 }
				}
			>
				Redirecting automatically in a few seconds...
			</motion.p>
		</div>
	);
}
