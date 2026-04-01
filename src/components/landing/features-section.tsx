'use client';

import { cn } from '@/utils/cn';
import { Keyboard, Sparkles, Users, type LucideIcon } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useRef } from 'react';
import { GrainOverlay } from './grain-overlay';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface ProofChapterData {
	icon: LucideIcon;
	title: string;
	description: string;
	imageSrc: string;
	imageAlt: string;
	imageWidth: number;
	imageHeight: number;
	accent: 'blue' | 'coral';
	imageClassName?: string;
}

const chapters: ProofChapterData[] = [
	{
		icon: Keyboard,
		title: 'Type once. Let structure appear immediately.',
		description:
			'Commands parse inline so rough notes become structured map content without breaking the typing rhythm that got the idea moving.',
		imageSrc: '/images/landing/node-editor.png',
		imageAlt: 'Node editor with task list and command preview',
		imageWidth: 1648,
		imageHeight: 1166,
		accent: 'coral',
		imageClassName: 'scale-[1.015] lg:translate-x-1',
	},
	{
		icon: Sparkles,
		title: 'Keep AI inside the same canvas.',
		description:
			'Ghost nodes and connection hints show up next to the work, which means you can accept, ignore, or reshape them without mode-switching.',
		imageSrc: '/images/landing/connection-suggestions.png',
		imageAlt: 'AI ghost nodes suggesting connections on the mind map canvas',
		imageWidth: 3046,
		imageHeight: 1886,
		accent: 'blue',
		imageClassName: 'scale-[1.03] lg:-translate-x-1',
	},
	{
		icon: Users,
		title: 'Invite people into the thinking, not the aftermath.',
		description:
			"Collaborators see the same map, the same cursors, and the same emerging structure in real time, so alignment happens before you're exporting anything.",
		imageSrc: '/images/landing/realtime.png',
		imageAlt: 'Multiple user cursors collaborating on a mind map in real-time',
		imageWidth: 2112,
		imageHeight: 1090,
		accent: 'blue',
		imageClassName: 'scale-[1.02] lg:translate-x-1',
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
	const isInView = useInView(ref, { once: true, margin: '-18% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;
	const isEven = index % 2 === 0;
	const Icon = chapter.icon;

	const glowClass =
		chapter.accent === 'coral'
			? 'bg-[radial-gradient(circle,rgba(224,133,106,0.16),transparent_62%)]'
			: 'bg-[radial-gradient(circle,rgba(96,165,250,0.18),transparent_62%)]';

	return (
		<article
			ref={ref}
			className={cn(
				'relative grid gap-12 py-8 lg:items-center',
				isEven
					? 'lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]'
					: 'lg:grid-cols-[minmax(0,1.24fr)_minmax(0,0.76fr)]'
			)}
		>
			<motion.div
				initial={
					shouldReduceMotion
						? { opacity: 1, x: 0 }
						: { opacity: 0, x: isEven ? -24 : 24 }
				}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.44, ease: EASE_OUT_QUART }
				}
				className={cn(
					'relative z-10 text-center lg:text-left',
					isEven ? 'lg:pr-4' : 'lg:order-2 lg:pl-8'
				)}
			>
				<div className={cn('mx-auto max-w-[29rem]', !isEven && 'lg:ml-auto')}>
					<div className='flex items-center justify-center gap-3 lg:justify-start'>
						<span className='text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-primary-300/70'>
							0{index + 1}
						</span>
						<div className='flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.02] text-primary-300'>
							<Icon aria-hidden='true' className='h-[18px] w-[18px]' />
						</div>
					</div>

					<h3 className='mx-auto mt-5 max-w-[16ch] text-balance font-lora text-[2.25rem] font-bold leading-[0.99] tracking-tight text-text-primary md:max-w-[15ch] md:text-[3rem] lg:mx-0 lg:max-w-[13ch]'>
						{chapter.title}
					</h3>
					<p className='mx-auto mt-4 max-w-[31rem] text-[1.03rem] leading-7 text-text-secondary md:text-lg lg:mx-0'>
						{chapter.description}
					</p>
				</div>
			</motion.div>

			<motion.div
				initial={
					shouldReduceMotion
						? { opacity: 1, x: 0 }
						: { opacity: 0, x: isEven ? 24 : -24 }
				}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.48, ease: EASE_OUT_QUART, delay: 0.08 }
				}
				className={cn(
					'relative mx-auto w-full max-w-[25rem] lg:max-w-none',
					isEven ? 'lg:ml-auto' : 'lg:order-1'
				)}
			>
				<div
					className={`pointer-events-none absolute -inset-8 opacity-95 blur-3xl ${glowClass}`}
				/>
				<div className='relative overflow-hidden rounded-[2rem] border border-transparent bg-transparent p-0 shadow-none md:rounded-[2.3rem] md:border-white/10 md:bg-[linear-gradient(180deg,rgba(18,22,30,0.94),rgba(10,12,18,0.84))] md:p-5 md:shadow-[0_32px_90px_rgba(0,0,0,0.38)]'>
					<div className='overflow-hidden rounded-[1.4rem] bg-[#06080c] ring-1 ring-inset ring-white/8 md:rounded-[1.6rem]'>
						<motion.div
							initial={
								shouldReduceMotion
									? { opacity: 1, scale: 1 }
									: { opacity: 0, scale: 0.985 }
							}
							animate={isInView ? { opacity: 1, scale: 1 } : {}}
							transition={
								shouldReduceMotion
									? { duration: 0 }
									: {
											duration: 0.55,
											delay: 0.16,
											ease: EASE_OUT_QUART,
										}
							}
							className={cn(
								'origin-center transition-transform duration-700',
								chapter.imageClassName
							)}
						>
							<Image
								src={chapter.imageSrc}
								alt={chapter.imageAlt}
								width={chapter.imageWidth}
								height={chapter.imageHeight}
								className='h-auto w-full'
								sizes='(min-width: 1024px) 56rem, 100vw'
							/>
						</motion.div>
					</div>
				</div>
			</motion.div>
		</article>
	);
}

export function FeaturesSection() {
	return (
		<section
			id='features'
			className='relative overflow-hidden bg-background px-6 py-20 sm:px-6 lg:px-8 lg:py-28'
		>
			<GrainOverlay />

			<div className='relative z-10 mx-auto max-w-6xl'>
				<div className='mx-auto max-w-2xl text-center lg:mx-0 lg:text-left'>
					<p className='text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-primary-300/70'>
						Features
					</p>
					<h2 className='mx-auto mt-5 max-w-[15ch] text-balance font-lora text-[2.5rem] font-bold leading-[0.98] tracking-tight text-text-primary md:max-w-[14ch] md:text-[3.95rem] lg:mx-0 lg:max-w-[12ch]'>
						One canvas from first note to team alignment.
					</h2>
					<p className='mx-auto mt-5 max-w-[37rem] text-pretty text-[1.03rem] leading-7 text-text-secondary md:text-lg lg:mx-0'>
						Shiko keeps capture, AI help, and collaboration inside the same
						working surface, so the map stays alive while the idea is still
						moving.
					</p>
				</div>

				<div className='mt-18 space-y-20 lg:space-y-24'>
					{chapters.map((chapter, index) => (
						<ProofChapter key={chapter.title} chapter={chapter} index={index} />
					))}
				</div>
			</div>
		</section>
	);
}
