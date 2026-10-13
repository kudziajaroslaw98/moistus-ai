'use client';

import { ArrowDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { HeroFrame } from './product/hero-frame';
import { StartMappingLink } from './start-mapping-link';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function HeroSection() {
	const shouldReduceMotion = useReducedMotion() ?? false;

	const scrollToStory = () => {
		document.getElementById('story')?.scrollIntoView({
			behavior: shouldReduceMotion ? 'auto' : 'smooth',
		});
	};

	const enter = (delay: number, y: number) =>
		shouldReduceMotion
			? { initial: { opacity: 1, y: 0 }, transition: { duration: 0 } }
			: {
					initial: { opacity: 0, y },
					transition: { duration: 0.5, ease: EASE_OUT_QUART, delay },
				};

	return (
		<section
			className='relative px-6 pb-4 pt-20 text-center sm:pt-24 lg:px-8'
			id='hero'
		>
			<div className='mx-auto max-w-6xl'>
				<motion.p
					animate={{ opacity: 1, y: 0 }}
					className='inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-text-secondary'
					{...enter(0, 12)}
				>
					<span className='size-1.5 rounded-full bg-primary-400' />
					Keyboard-first mind mapping
				</motion.p>

				<motion.h1
					animate={{ opacity: 1, y: 0 }}
					className='mx-auto mt-7 max-w-[15ch] text-balance font-lora text-[2.75rem] font-semibold leading-none tracking-tight text-white sm:text-6xl lg:text-[6rem]'
					{...enter(0.08, 24)}
				>
					Every plan starts as{' '}

					<em className='font-medium text-brand-coral'>one loose thought.</em>
				</motion.h1>

				<motion.p
					animate={{ opacity: 1, y: 0 }}
					className='mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-text-secondary sm:text-xl'
					{...enter(0.16, 16)}
				>
					Shiko gives it room to grow. Capture it from the keyboard, let AI
					suggest what&apos;s missing, and shape it with your team, on one live
					canvas.
				</motion.p>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center'
					{...enter(0.24, 14)}
				>
					<StartMappingLink
						showArrow
						arrowClassName='landing-hero-primary-cta-arrow h-4 w-4 transition-transform duration-200'
						className='landing-hero-primary-cta inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-neutral-900 shadow-[0_12px_40px_rgba(255,255,255,0.12)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
					/>

					<button
						className='landing-hero-secondary-cta inline-flex h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#292929] bg-white/[0.03] px-5 text-base font-medium text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
						onClick={scrollToStory}
						type='button'
					>
						Watch a map grow
						<ArrowDown aria-hidden='true' className='size-4' />
					</button>
				</motion.div>

				<motion.p
					animate={{ opacity: 1 }}
					className='mt-4 text-sm text-text-tertiary'
					{...enter(0.3, 0)}
				>
					Free for personal use · Runs in your browser
				</motion.p>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='mt-14'
					{...enter(0.34, 28)}
				>
					<HeroFrame />
				</motion.div>
			</div>
		</section>
	);
}
