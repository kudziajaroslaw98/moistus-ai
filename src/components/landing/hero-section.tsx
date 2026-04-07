'use client';

import { cn } from '@/utils/cn';
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
			className='relative isolate overflow-hidden bg-background px-6 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:pb-24 lg:pt-32'
		>
			<HeroBackground />

			<div className='relative mx-auto grid w-full max-w-6xl items-center gap-7 md:min-h-[calc(100svh-7rem)] md:gap-12 lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)] lg:gap-16'>
				<div className='relative z-10 mx-auto max-w-xl text-center lg:mx-0 lg:text-left'>
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
						className='mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-text-secondary backdrop-blur-xl lg:mx-0'
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
						className='mx-auto mt-5 max-w-[17ch] text-balance font-lora text-[2.4rem] font-bold leading-[0.96] tracking-tight text-white sm:max-w-[15ch] sm:text-[3.2rem] md:max-w-[14ch] md:text-[3.85rem] lg:mx-0 lg:max-w-[12ch] lg:text-[4.3rem]'
					>
						Go from spark to clarity, fast.
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
						className='mx-auto mt-7 max-w-[35rem] text-pretty text-[1.03rem] leading-7 text-text-secondary sm:text-lg lg:mx-0'
					>
						Don't let good momentum get buried in organization overhead.
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
						className='mx-auto mt-5 flex max-w-sm flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:mx-0 lg:mt-6 lg:max-w-none'
					>
						<a
							href='/dashboard'
							className='landing-hero-primary-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-neutral-900 shadow-[0_12px_40px_rgba(255,255,255,0.14)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
						>
							Start Mapping
							<ArrowRight
								aria-hidden='true'
								className='landing-hero-primary-cta-arrow h-4 w-4 transition-transform duration-200'
							/>
						</a>
						<button
							onClick={scrollToFeatures}
							className='landing-hero-secondary-cta inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-base font-medium text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
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
						className='mt-7 hidden gap-3 sm:grid sm:grid-cols-3'
					>
						{heroPoints.map((point, index) => {
							const Icon = point.icon;

							return (
								<div
									key={point.label}
									className={cn(
										'flex items-start gap-3 text-left',
										index === 0
											? 'pt-0'
											: 'border-t border-white/8 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0'
									)}
								>
									<Icon
										aria-hidden='true'
										className='mt-0.5 h-4 w-4 shrink-0 text-primary-300'
									/>
									<p className='text-sm font-medium leading-6 text-text-secondary'>
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
					className='relative mx-auto w-full max-w-[22.5rem] overflow-visible sm:max-w-[27rem] md:max-w-[48rem] lg:mx-0 lg:w-[52rem] lg:max-w-none lg:translate-x-72 lg:justify-self-end xl:w-[56rem] xl:translate-x-80'
				>
					<HeroMapScene />
				</motion.div>
			</div>
		</section>
	);
}
