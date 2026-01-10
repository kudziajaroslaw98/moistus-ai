'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { Brain, Users, Zap } from 'lucide-react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface Feature {
	icon: typeof Brain;
	title: string;
	headline: string;
	description: string;
	imagePlaceholder: string;
}

const features: Feature[] = [
	{
		icon: Brain,
		title: 'AI-Native Intelligence',
		headline: 'AI that thinks with you, not after you',
		description:
			'Ghost nodes suggest connections as you work. No separate "AI button" — insights emerge naturally from your thinking flow.',
		imagePlaceholder: 'Ghost node suggestions appearing on canvas',
	},
	{
		icon: Users,
		title: 'Real-Time Collaboration',
		headline: 'Think together, in real-time',
		description:
			"See teammates' cursors, edits, and ideas instantly. Brainstorm sessions that feel like being in the same room.",
		imagePlaceholder: 'Multiple cursors + avatar stack on canvas',
	},
	{
		icon: Zap,
		title: 'Speed-First Editor',
		headline: 'Type once, structure automatically',
		description:
			'Commands like $task, #tags, @mentions parsed instantly. A learning curve that pays off in minutes saved daily.',
		imagePlaceholder: 'Node editor with command preview',
	},
];

function FeatureBlock({
	feature,
	index,
}: {
	feature: Feature;
	index: number;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;
	const isEven = index % 2 === 0;
	const Icon = feature.icon;

	return (
		<div
			ref={ref}
			className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${
				isEven ? '' : 'md:direction-rtl'
			}`}
		>
			{/* Text */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: isEven ? -20 : 20 }}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT_QUART }}
				className={`${isEven ? '' : 'md:order-2'} md:direction-ltr`}
			>
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 rounded-lg bg-primary-500/10">
						<Icon className="h-5 w-5 text-primary-400" />
					</div>
					<span className="text-sm font-medium text-primary-400">
						{feature.title}
					</span>
				</div>
				<h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
					{feature.headline}
				</h3>
				<p className="text-lg text-text-secondary leading-relaxed">
					{feature.description}
				</p>
			</motion.div>

			{/* Image placeholder */}
			<motion.div
				initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: isEven ? 20 : -20 }}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.3, ease: EASE_OUT_QUART, delay: 0.1 }
				}
				className={`${isEven ? '' : 'md:order-1'} md:direction-ltr`}
			>
				<div
					className="aspect-video rounded-xl border border-border-subtle bg-surface/50 backdrop-blur-sm flex items-center justify-center p-8"
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
					}}
				>
					{/* TODO: Replace with actual screenshot */}
					<p className="text-text-tertiary text-sm text-center">
						{feature.imagePlaceholder}
					</p>
				</div>
			</motion.div>
		</div>
	);
}

export function FeaturesSection() {
	return (
		<section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
			<div className="max-w-6xl mx-auto space-y-24">
				{features.map((feature, index) => (
					<FeatureBlock key={feature.title} feature={feature} index={index} />
				))}
			</div>
		</section>
	);
}
