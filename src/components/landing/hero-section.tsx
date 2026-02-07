'use client';

import { ArrowRight, ChevronDown } from 'lucide-react';
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
			<HeroBackground />

			<div className='relative w-full max-w-6xl mx-auto text-center'>
				{/* Headline — screen blend composites text with shader beneath */}
				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }
					}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.6, ease: EASE_OUT_QUART }
					}
				>
					<h1 className='font-lora text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1] tracking-tight text-white'>
						From Scattered Notes
						<br />
						to Connected Ideas
					</h1>
				</motion.div>

				{/* Subheadline */}
				<motion.p
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
					}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.4, ease: EASE_OUT_QUART, delay: 0.2 }
					}
					className='relative z-10 mt-8 text-base sm:text-lg leading-relaxed text-neutral-300 max-w-lg mx-auto'
				>
					AI-native mind mapping for power users. Keyboard-first,
					real-time, and dangerously fast.
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
							: { duration: 0.4, ease: EASE_OUT_QUART, delay: 0.3 }
					}
					className='relative z-10 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4'
				>
					<div className='group'>
						<a
							href='/dashboard'
							className='inline-flex items-center gap-2 justify-center px-8 py-3.5 text-base font-semibold rounded-lg bg-white text-neutral-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] translate-y-0 transition-all duration-200 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] group-hover:-translate-y-0.5'
						>
							Start Mapping
							<ArrowRight
								aria-hidden='true'
								className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5'
							/>
						</a>
					</div>
					<button
						onClick={scrollToFeatures}
						className='inline-flex items-center justify-center px-4 py-3.5 text-base font-medium text-neutral-300 hover:text-white transition-colors duration-200'
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
						: { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.6 }
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
