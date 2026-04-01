'use client';

import { Brain, Keyboard, Sparkles, Users } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useRef } from 'react';
import { GrainOverlay } from './grain-overlay';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface ProofChapterData {
	icon: typeof Brain;
	kicker: string;
	title: string;
	description: string;
	imageSrc: string;
	imageAlt: string;
	imageWidth: number;
	imageHeight: number;
	callouts: Array<{
		text: string;
		tone?: 'blue' | 'coral';
	}>;
}

const chapters: ProofChapterData[] = [
	{
		icon: Keyboard,
		kicker: 'Capture speed',
		title: 'Type once. Let structure appear immediately.',
		description:
			'Commands parse inline so rough notes become structured map content without breaking the typing rhythm that got the idea moving.',
		imageSrc: '/images/landing/node-editor.png',
		imageAlt: 'Node editor with task list and command preview',
		imageWidth: 1648,
		imageHeight: 1166,
		callouts: [
			{
				text: 'Commands stay inside the flow, not behind a toolbar hunt.',
			},
			{
				text: 'Structure appears while you type, so the canvas keeps up.',
				tone: 'coral',
			},
		],
	},
	{
		icon: Sparkles,
		kicker: 'AI in context',
		title: 'Keep AI inside the same canvas.',
		description:
			'Ghost nodes and connection hints show up next to the work, which means you can accept, ignore, or reshape them without mode-switching.',
		imageSrc: '/images/landing/connection-suggestions.png',
		imageAlt: 'AI ghost nodes suggesting connections on the mind map canvas',
		imageWidth: 3046,
		imageHeight: 1886,
		callouts: [
			{
				text: 'Suggestions stay visible where the map is already taking shape.',
			},
			{
				text: 'Accept or ignore without leaving the same train of thought.',
			},
		],
	},
	{
		icon: Users,
		kicker: 'Live collaboration',
		title: 'Invite people into the thinking, not the aftermath.',
		description:
			"Collaborators see the same map, the same cursors, and the same emerging structure in real time, so alignment happens before you're exporting anything.",
		imageSrc: '/images/landing/realtime.png',
		imageAlt: 'Multiple user cursors collaborating on a mind map in real-time',
		imageWidth: 2112,
		imageHeight: 1090,
		callouts: [
			{
				text: 'Everyone stays inside one shared canvas instead of trading screenshots.',
			},
			{
				text: 'Live cursors keep the work conversational even when the team is remote.',
				tone: 'coral',
			},
		],
	},
];

function ProofChapter({
	chapter,
	index,
}: {
	chapter: ProofChapterData;
	index: number;
}) {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;
	const isEven = index % 2 === 0;
	const Icon = chapter.icon;

	return (
		<article
			ref={ref}
			className='relative grid gap-8 py-4 lg:grid-cols-2 lg:gap-14 lg:py-6'
		>
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
						: { duration: 0.42, ease: EASE_OUT_QUART }
				}
				className={isEven ? '' : 'lg:order-2'}
			>
				<div className='max-w-lg'>
					<div className='flex items-center gap-3'>
						<div className='flex h-10 w-10 items-center justify-center rounded-full border border-primary-400/18 bg-primary-500/10 text-primary-300'>
							<Icon aria-hidden='true' className='h-4 w-4' />
						</div>
						<div>
							<p className='text-xs font-medium uppercase tracking-[0.24em] text-primary-300/70'>
								0{index + 1}
							</p>
							<p className='mt-1 text-sm font-semibold text-text-primary'>
								{chapter.kicker}
							</p>
						</div>
					</div>
					<h3 className='mt-6 max-w-[16ch] text-balance font-lora text-3xl font-bold leading-[1.1] tracking-tight text-text-primary md:text-4xl'>
						{chapter.title}
					</h3>
					<p className='mt-4 text-base leading-7 text-text-secondary md:text-lg'>
						{chapter.description}
					</p>
				</div>
			</motion.div>

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
						: { duration: 0.42, ease: EASE_OUT_QUART, delay: 0.08 }
				}
				className={isEven ? '' : 'lg:order-1'}
			>
				<div className='relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,30,0.92),rgba(11,14,20,0.84))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)]'>
					<div className='mb-4 flex items-center justify-between px-1 text-xs font-medium text-text-tertiary'>
						<span className='inline-flex items-center gap-2 uppercase tracking-[0.24em]'>
							<span className='h-1.5 w-1.5 rounded-full bg-primary-400' />
							Product proof
						</span>
						<span className='text-text-secondary'>{chapter.kicker}</span>
					</div>

					<div className='overflow-hidden rounded-[1.35rem] bg-[#07090d] ring-1 ring-inset ring-white/8'>
						<Image
							src={chapter.imageSrc}
							alt={chapter.imageAlt}
							width={chapter.imageWidth}
							height={chapter.imageHeight}
							className='h-auto w-full'
						/>
					</div>

					<div className='mt-4 grid gap-3 sm:grid-cols-2'>
						{chapter.callouts.map((callout) => (
							<div
								key={callout.text}
								className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
									callout.tone === 'coral'
										? 'bg-brand-coral/[0.08] text-text-primary ring-1 ring-inset ring-brand-coral/16'
										: 'bg-white/[0.04] text-text-secondary ring-1 ring-inset ring-white/8'
								}`}
							>
								{callout.text}
							</div>
						))}
					</div>
				</div>
			</motion.div>

			<div className='absolute left-1/2 top-14 hidden h-4 w-4 -translate-x-1/2 rounded-full border border-primary-400/20 bg-background shadow-[0_0_0_6px_rgba(9,11,16,0.95)] lg:block'>
				<div className='absolute inset-1 rounded-full bg-primary-400/55' />
			</div>
		</article>
	);
}

export function FeaturesSection() {
	return (
		<section
			id='features'
			className='relative overflow-hidden bg-background px-4 py-24 sm:px-6 lg:px-8 lg:py-28'
		>
			<GrainOverlay />
			<div className='pointer-events-none absolute left-1/2 top-32 hidden h-[calc(100%-10rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary-400/18 to-transparent lg:block' />

			<div className='relative z-10 mx-auto max-w-6xl'>
				<div className='max-w-2xl'>
					<p className='text-xs font-medium uppercase tracking-[0.28em] text-primary-300/70'>
						Product proof
					</p>
					<h2 className='mt-4 max-w-[13ch] text-balance font-lora text-3xl font-bold leading-[1.08] tracking-tight text-text-primary md:text-5xl'>
						Every step keeps you inside the same train of thought.
					</h2>
					<p className='mt-5 max-w-[40rem] text-pretty text-base leading-7 text-text-secondary md:text-lg'>
						Shiko is designed so capture, AI help, and collaboration all happen
						in the same working surface. The page should prove that, not just
						say it.
					</p>
				</div>

				<div className='mt-14 space-y-16 lg:space-y-20'>
					{chapters.map((chapter, index) => (
						<ProofChapter
							key={chapter.kicker}
							chapter={chapter}
							index={index}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
