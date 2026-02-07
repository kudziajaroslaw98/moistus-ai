'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface SectionDecorationProps {
	variant: 'problem' | 'features' | 'howItWorks' | 'pricing' | 'faq';
}

/**
 * Per-section decorative elements that animate in on scroll.
 * Each variant has unique visual treatment matching the section's theme.
 */
export function SectionDecoration({ variant }: SectionDecorationProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-10% 0px' });
	const shouldReduceMotion = useReducedMotion();

	const decorations = {
		problem: (
			<ProblemDecoration
				isInView={isInView}
				shouldReduceMotion={shouldReduceMotion}
			/>
		),
		features: (
			<FeaturesDecoration
				isInView={isInView}
				shouldReduceMotion={shouldReduceMotion}
			/>
		),
		howItWorks: (
			<HowItWorksDecoration
				isInView={isInView}
				shouldReduceMotion={shouldReduceMotion}
			/>
		),
		pricing: (
			<PricingDecoration
				isInView={isInView}
				shouldReduceMotion={shouldReduceMotion}
			/>
		),
		faq: (
			<FaqDecoration
				isInView={isInView}
				shouldReduceMotion={shouldReduceMotion}
			/>
		),
	};

	return (
		<div
			ref={ref}
			className='absolute inset-0 overflow-hidden pointer-events-none'
		>
			{decorations[variant]}
		</div>
	);
}

interface DecorationProps {
	isInView: boolean;
	shouldReduceMotion: boolean | null;
}

/**
 * Problem: Subtle center glow with minimal accents
 */
function ProblemDecoration({ isInView, shouldReduceMotion }: DecorationProps) {
	return (
		<>
			{/* Soft center glow — warm coral */}
			<motion.div
				className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px]'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={isInView ? { opacity: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.8, ease: EASE_OUT_QUART }
				}
				style={{
					background:
						'radial-gradient(ellipse, rgba(224, 133, 106, 0.04), transparent 70%)',
				}}
			/>

			{/* Bottom edge line — coral tint */}
			<motion.div
				className='absolute bottom-0 left-0 right-0 h-px'
				initial={
					shouldReduceMotion
						? { opacity: 1, scaleX: 1 }
						: { opacity: 0, scaleX: 0 }
				}
				animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.6, ease: EASE_OUT_QUART, delay: 0.3 }
				}
				style={{
					background:
						'linear-gradient(90deg, transparent, rgba(224, 133, 106, 0.15), transparent)',
					transformOrigin: 'center',
				}}
			/>
		</>
	);
}

/**
 * Features: Floating dots and circuit-like patterns
 */
function FeaturesDecoration({ isInView, shouldReduceMotion }: DecorationProps) {
	const dots = [
		{ top: '10%', left: '5%', size: 8, delay: 0 },
		{ top: '25%', right: '8%', size: 6, delay: 0.1 },
		{ top: '60%', left: '3%', size: 10, delay: 0.2 },
		{ top: '80%', right: '5%', size: 5, delay: 0.3 },
		{ top: '45%', right: '2%', size: 7, delay: 0.15 },
	];

	return (
		<>
			{/* Floating dots — coral for first 2, blue for rest */}
			{dots.map((dot, i) => (
				<motion.div
					key={i}
					className={`absolute rounded-full ${i < 2 ? 'bg-brand-coral/20' : 'bg-primary-500/20'}`}
					style={{
						top: dot.top,
						left: dot.left,
						right: dot.right,
						width: dot.size,
						height: dot.size,
					}}
					initial={
						shouldReduceMotion
							? { opacity: 1, scale: 1 }
							: { opacity: 0, scale: 0 }
					}
					animate={isInView ? { opacity: 1, scale: 1 } : {}}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.4, ease: EASE_OUT_QUART, delay: dot.delay }
					}
				/>
			))}

			{/* Vertical accent line - left */}
			<motion.div
				className='absolute left-0 top-1/4 w-px h-1/2'
				initial={
					shouldReduceMotion
						? { opacity: 1, scaleY: 1 }
						: { opacity: 0, scaleY: 0 }
				}
				animate={isInView ? { opacity: 1, scaleY: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.5, ease: EASE_OUT_QUART, delay: 0.2 }
				}
				style={{
					background:
						'linear-gradient(180deg, transparent, rgba(96, 165, 250, 0.2), transparent)',
					transformOrigin: 'top',
				}}
			/>
		</>
	);
}

/**
 * How It Works: Step connectors and number highlights
 */
function HowItWorksDecoration({
	isInView,
	shouldReduceMotion,
}: DecorationProps) {
	return (
		<>
			<motion.div
				className='absolute top-0 left-0 right-0 h-px'
				initial={
					shouldReduceMotion
						? { opacity: 1, scaleX: 1 }
						: { opacity: 0, scaleX: 0 }
				}
				animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.6, ease: EASE_OUT_QUART, delay: 0.3 }
				}
				style={{
					background:
						'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.2), transparent)',
					transformOrigin: 'center',
				}}
			/>

			{/* Bottom accent */}
			<motion.div
				className='absolute bottom-0 left-0 right-0 h-px'
				initial={
					shouldReduceMotion
						? { opacity: 1, scaleX: 1 }
						: { opacity: 0, scaleX: 0 }
				}
				animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.6, ease: EASE_OUT_QUART, delay: 0.3 }
				}
				style={{
					background:
						'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.2), transparent)',
					transformOrigin: 'center',
				}}
			/>
		</>
	);
}

/**
 * Pricing: Card glow effects and comparison indicators
 */
function PricingDecoration({ isInView, shouldReduceMotion }: DecorationProps) {
	return (
		<>
			{/* Central glow behind cards */}
			<motion.div
				className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]'
				initial={
					shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }
				}
				animate={isInView ? { opacity: 1, scale: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.6, ease: EASE_OUT_QUART }
				}
				style={{
					background:
						'radial-gradient(ellipse, rgba(96, 165, 250, 0.05), transparent 70%)',
				}}
			/>

			{/* Corner sparkles */}
			<motion.div
				className='absolute top-12 right-12 w-2 h-2 rounded-full bg-primary-400/30'
				initial={
					shouldReduceMotion
						? { opacity: 1, scale: 1 }
						: { opacity: 0, scale: 0 }
				}
				animate={isInView ? { opacity: 1, scale: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.3, ease: EASE_OUT_QUART, delay: 0.4 }
				}
			/>
			<motion.div
				className='absolute top-20 right-20 w-1.5 h-1.5 rounded-full bg-primary-400/20'
				initial={
					shouldReduceMotion
						? { opacity: 1, scale: 1 }
						: { opacity: 0, scale: 0 }
				}
				animate={isInView ? { opacity: 1, scale: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.3, ease: EASE_OUT_QUART, delay: 0.5 }
				}
			/>

			{/* Horizontal accent lines */}
			<motion.div
				className='absolute top-0 left-0 right-0 h-px'
				initial={
					shouldReduceMotion
						? { opacity: 1, scaleX: 1 }
						: { opacity: 0, scaleX: 0 }
				}
				animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.5, ease: EASE_OUT_QUART }
				}
				style={{
					background:
						'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.2), transparent)',
					transformOrigin: 'center',
				}}
			/>
		</>
	);
}

/**
 * FAQ: Accordion-themed decorations with question marks
 */
function FaqDecoration({ isInView, shouldReduceMotion }: DecorationProps) {
	return (
		<>
			{/* Large question mark - background */}
			<motion.div
				className='absolute top-1/2 right-8 -translate-y-1/2 text-[200px] leading-none font-bold text-white/[0.02] select-none'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.6, ease: EASE_OUT_QUART }
				}
			>
				?
			</motion.div>

			{/* Top gradient */}
			<motion.div
				className='absolute top-0 left-0 right-0 h-24'
				initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
				animate={isInView ? { opacity: 1 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.5, ease: EASE_OUT_QUART }
				}
				style={{
					background:
						'linear-gradient(180deg, rgba(5, 5, 6, 0.5), transparent)',
				}}
			/>

			{/* Accent dots */}
			{[
				{ top: '20%', left: '5%', delay: 0.2 },
				{ top: '50%', left: '3%', delay: 0.3 },
				{ top: '75%', left: '6%', delay: 0.4 },
			].map((dot, i) => (
				<motion.div
					key={i}
					className='absolute w-1.5 h-1.5 rounded-full bg-primary-500/20'
					style={{ top: dot.top, left: dot.left }}
					initial={
						shouldReduceMotion
							? { opacity: 1, scale: 1 }
							: { opacity: 0, scale: 0 }
					}
					animate={isInView ? { opacity: 1, scale: 1 } : {}}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.3, ease: EASE_OUT_QUART, delay: dot.delay }
					}
				/>
			))}
		</>
	);
}
