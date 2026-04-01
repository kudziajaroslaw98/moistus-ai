'use client';

import { ArrowRight, Keyboard, Sparkles, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { HeroBackground } from './hero-background';
import { HeroMapScene } from './hero-map-scene';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const heroPoints = [
	{
		icon: Keyboard,
		label: 'Command-aware capture',
	},
	{
		icon: Sparkles,
		label: 'Ghost-node AI guidance',
	},
	{
		icon: Users,
		label: 'Live shared canvases',
	},
] as const;

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
			className='relative isolate overflow-hidden bg-background px-4 pb-12 pt-28 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20 lg:pt-32'
		>
			<HeroBackground />

			<div className='relative mx-auto grid min-h-[calc(100svh-7rem)] w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)] lg:gap-16'>
				<div className='relative z-10 max-w-xl'>
					<motion.p
						initial={
							shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
						}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.45, ease: EASE_OUT_QUART }
						}
						className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-text-secondary backdrop-blur-xl'
					>
						<span className='h-1.5 w-1.5 rounded-full bg-primary-400' />
						Keyboard-first mind mapping
					</motion.p>

					<motion.h1
						initial={
							shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }
						}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.58, ease: EASE_OUT_QUART, delay: 0.08 }
						}
						className='mt-6 max-w-[11ch] text-balance font-lora text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.5rem]'
					>
						Turn scattered thoughts into a shared map that keeps up.
					</motion.h1>

					<motion.p
						initial={
							shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }
						}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.45, ease: EASE_OUT_QUART, delay: 0.18 }
						}
						className='mt-6 max-w-[36rem] text-pretty text-base leading-7 text-text-secondary sm:text-lg'
					>
						Capture ideas fast, let AI surface missing links in context, and
						work with collaborators inside the same canvas before momentum
						fades.
					</motion.p>

					<motion.div
						initial={
							shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
						}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.45, ease: EASE_OUT_QUART, delay: 0.28 }
						}
						className='mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center'
					>
						<a
							href='/dashboard'
							className='inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-neutral-900 shadow-[0_12px_40px_rgba(255,255,255,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(255,255,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
						>
							Start Mapping
							<ArrowRight aria-hidden='true' className='h-4 w-4' />
						</a>
						<button
							onClick={scrollToFeatures}
							className='inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-base font-medium text-text-primary transition-colors duration-200 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
						>
							See the workflow
						</button>
					</motion.div>

					<motion.div
						initial={
							shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }
						}
						animate={{ opacity: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.45, ease: EASE_OUT_QUART, delay: 0.38 }
						}
						className='mt-7 grid gap-3 sm:grid-cols-3'
					>
						{heroPoints.map((point) => {
							const Icon = point.icon;

							return (
								<div
									key={point.label}
									className='rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl'
								>
									<Icon
										aria-hidden='true'
										className='h-4 w-4 text-primary-300'
									/>
									<p className='mt-2 text-sm font-medium text-text-secondary'>
										{point.label}
									</p>
								</div>
							);
						})}
					</motion.div>
				</div>

				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }
					}
					animate={{ opacity: 1, y: 0 }}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.6, ease: EASE_OUT_QUART, delay: 0.22 }
					}
					className='relative'
				>
					<HeroMapScene />
				</motion.div>
			</div>
		</section>
	);
}
