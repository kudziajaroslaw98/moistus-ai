'use client';

import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { HeroBackground } from './hero-background';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function HeroSection() {
	const shouldReduceMotion = useReducedMotion() ?? false;

	const scrollToFeatures = () => {
		document.getElementById('features')?.scrollIntoView({
			behavior: shouldReduceMotion ? 'auto' : 'smooth',
		});
	};

	return (
		<section
			id='hero'
			className='relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 bg-background'
		>
			{/* Hero-specific background with animated node network */}
			<HeroBackground />

			<div className='relative z-10 max-w-4xl mx-auto text-center'>
				{/* Headline */}
				<motion.h1
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
					}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.25, ease: EASE_OUT_QUART }
					}
					className='font-lora text-4xl font-bold tracking-tighter text-text-primary sm:text-5xl md:text-7xl'
				>
					<span className='block'>
						From <span className='text-brand-coral'>Scattered Notes</span>
					</span>
					<span className='block'>
						to <span className='text-primary-400'>Connected Ideas</span>
					</span>
				</motion.h1>

				{/* Subheadline */}
				<motion.p
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
					}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.1 }
					}
					className='mt-6 text-lg leading-relaxed text-text-secondary max-w-2xl mx-auto'
				>
					The mind mapping tool for power users. AI-native suggestions,
					real-time collaboration, and a keyboard-first editor that makes you
					dangerously fast.
				</motion.p>

				{/* CTAs */}
				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
					}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.2 }
					}
					className='mt-10 flex flex-col sm:flex-row items-center justify-center gap-4'
				>
					<div className='group'>
						<a
							href='/dashboard'
							className='inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-md bg-primary-600 group-hover:bg-primary-500 text-white shadow-[0_4px_14px_rgba(96,165,250,0.25)] translate-y-0 transition-all duration-200 group-hover:shadow-[0_8px_30px_rgba(96,165,250,0.4)] group-hover:-translate-y-0.5'
						>
							Start Mapping
						</a>
					</div>
					<button
						onClick={scrollToFeatures}
						className='inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-md bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors duration-200'
					>
						See How It Works
					</button>
				</motion.div>
			</div>

			{/* Scroll indicator */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.4 }
				}
				className='absolute bottom-8 left-1/2 -translate-x-1/2 z-10'
			>
				{shouldReduceMotion ? (
					<ChevronDown
						aria-hidden='true'
						className='h-6 w-6 text-text-tertiary'
					/>
				) : (
					<motion.div
						animate={{ y: [0, 8, 0] }}
						transition={{
							duration: 1.5,
							repeat: Infinity,
							ease: [0.645, 0.045, 0.355, 1],
						}}
					>
						<ChevronDown
							aria-hidden='true'
							className='h-6 w-6 text-text-tertiary'
						/>
					</motion.div>
				)}
			</motion.div>
		</section>
	);
}
