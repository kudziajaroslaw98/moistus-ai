'use client';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Sparkles } from 'lucide-react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function HeroSection() {
	const shouldReduceMotion = useReducedMotion() ?? false;

	const scrollToFeatures = () => {
		document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
	};

	return (
		<section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
			<div className="max-w-4xl mx-auto text-center">
				{/* Badge */}
				<motion.div
					initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: EASE_OUT_QUART }}
					className="mb-6"
				>
					<span className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-400 ring-1 ring-inset ring-primary-500/20 backdrop-blur-sm">
						<Sparkles className="h-4 w-4" />
						AI-Powered Mind Mapping
					</span>
				</motion.div>

				{/* Headline */}
				<motion.h1
					initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.1 }}
					className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl md:text-6xl"
				>
					<span className="block">
						From <span className="text-brand-coral">Scattered Notes</span>
					</span>
					<span className="block">
						to <span className="text-primary-400">Connected Ideas</span>
					</span>
				</motion.h1>

				{/* Subheadline */}
				<motion.p
					initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.2 }}
					className="mt-6 text-lg leading-relaxed text-text-secondary max-w-2xl mx-auto"
				>
					The mind mapping tool for power users. AI-native suggestions,
					real-time collaboration, and a keyboard-first editor that makes
					you dangerously fast.
				</motion.p>

				{/* CTAs */}
				<motion.div
					initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.3 }}
					className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
				>
					<a
						href="/try"
						className={cn(
							buttonVariants({ size: 'lg' }),
							'px-8 py-3 text-base font-semibold bg-primary-600 hover:bg-primary-500 transition-all duration-200 hover:-translate-y-0.5'
						)}
					>
						Try Free
					</a>
					<button
						onClick={scrollToFeatures}
						className={cn(
							buttonVariants({ size: 'lg', variant: 'ghost' }),
							'px-8 py-3 text-base text-text-secondary hover:text-text-primary'
						)}
					>
						See How It Works
					</button>
				</motion.div>
			</div>

			{/* Scroll indicator */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.5 }}
				className="absolute bottom-8 left-1/2 -translate-x-1/2"
			>
				{shouldReduceMotion ? (
					<ChevronDown className="h-6 w-6 text-text-tertiary" />
				) : (
					<motion.div
						animate={{ y: [0, 8, 0] }}
						transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
					>
						<ChevronDown className="h-6 w-6 text-text-tertiary" />
					</motion.div>
				)}
			</motion.div>
		</section>
	);
}
