'use client';

import { Brain, Users, Zap } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { SectionDecoration } from './section-decorations';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface Feature {
	icon: typeof Brain;
	title: string;
	headline: string;
	description: string;
	imageSrc: string;
	imageAlt: string;
}

const features: Feature[] = [
	{
		icon: Brain,
		title: 'AI-Native Intelligence',
		headline: 'AI that thinks with you, not after you',
		description:
			'Ghost nodes suggest connections as you work. No separate "AI button" — insights emerge naturally from your thinking flow.',
		imageSrc: '/images/landing/connection-suggestions.png',
		imageAlt: 'AI ghost nodes suggesting connections on the mind map canvas',
	},
	{
		icon: Users,
		title: 'Real-Time Collaboration',
		headline: 'Think together, in real-time',
		description:
			"See teammates' cursors, edits, and ideas instantly. Brainstorm sessions that feel like being in the same room.",
		imageSrc: '/images/landing/realtime.png',
		imageAlt: 'Multiple user cursors collaborating on a mind map in real-time',
	},
	{
		icon: Zap,
		title: 'Speed-First Editor',
		headline: 'Type once, structure automatically',
		description:
			'Commands like $task, #tags, @mentions parsed instantly. A learning curve that pays off in minutes saved daily.',
		imageSrc: '/images/landing/node-editor.png',
		imageAlt: 'Node editor with task list and command preview',
	},
];

function FeatureBlock({ feature, index }: { feature: Feature; index: number }) {
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
				initial={
					shouldReduceMotion
						? { opacity: 1, x: 0 }
						: { opacity: 0, x: isEven ? -20 : 20 }
				}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.3, ease: EASE_OUT_QUART }
				}
				className={`${isEven ? '' : 'md:order-2'} md:direction-ltr`}
			>
				<div className='group flex items-center gap-3 mb-4'>
					<div className='p-2 rounded-lg bg-primary-500/10 scale-100 transition-all duration-200 group-hover:bg-primary-500/20 group-hover:scale-110'>
						<Icon aria-hidden="true" className='h-5 w-5 text-primary-400 transition-colors duration-200 group-hover:text-primary-300' />
					</div>
					<span className='text-sm font-medium text-primary-400 transition-colors duration-200 group-hover:text-primary-300'>
						{feature.title}
					</span>
				</div>
				<h3 className='font-lora text-2xl md:text-3xl font-bold text-text-primary mb-4'>
					{feature.headline}
				</h3>
				<p className='text-lg text-text-secondary leading-relaxed'>
					{feature.description}
				</p>
			</motion.div>

			{/* Feature image */}
			<motion.div
				initial={
					shouldReduceMotion
						? { opacity: 1, x: 0 }
						: { opacity: 0, x: isEven ? 20 : -20 }
				}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.3, ease: EASE_OUT_QUART, delay: 0.1 }
				}
				className={`${isEven ? 'md:-mr-8' : 'md:order-1 md:-ml-8'} md:direction-ltr`}
			>
				<div
					className='rounded-xl border border-border-subtle bg-surface/50 backdrop-blur-sm overflow-hidden transition-shadow duration-500'
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
						boxShadow: isInView
							? '0 0 40px rgba(96, 165, 250, 0.08), 0 0 80px rgba(96, 165, 250, 0.04)'
							: 'none',
					}}
				>
					<img
						src={feature.imageSrc}
						alt={feature.imageAlt}
						width={800}
						height={450}
						className='w-full h-auto'
						loading='lazy'
					/>
				</div>
			</motion.div>
		</div>
	);
}

export function FeaturesSection() {
	return (
		<section
			id='features'
			className='relative py-32 px-4 sm:px-6 lg:px-8 bg-elevated/30'
		>
			<SectionDecoration variant='features' />
			<div className='relative z-10 max-w-7xl mx-auto space-y-24'>
				{features.map((feature, index) => (
					<FeatureBlock key={feature.title} feature={feature} index={index} />
				))}
			</div>
		</section>
	);
}
