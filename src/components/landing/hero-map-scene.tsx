'use client';

import { Keyboard, Sparkles, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const captureCards = [
	{
		title: 'Launch notes',
		body: 'Value prop still fuzzy',
		className: 'left-[7%] top-[12%] w-[34%]',
		delay: 0.05,
	},
	{
		title: 'Research thread',
		body: 'Users want fast structure',
		className: 'left-[9%] top-[38%] w-[32%]',
		delay: 0.15,
	},
	{
		title: 'Team sync',
		body: 'Share the same live map',
		className: 'left-[12%] top-[64%] w-[30%]',
		delay: 0.25,
	},
] as const;

const mapNodes = [
	{
		label: 'Core message',
		className: 'right-[16%] top-[16%] w-[24%]',
		delay: 0.45,
		tone: 'blue' as const,
	},
	{
		label: 'User pain',
		className: 'right-[10%] top-[44%] w-[24%]',
		delay: 0.56,
		tone: 'coral' as const,
	},
	{
		label: 'Launch plan',
		className: 'right-[24%] top-[68%] w-[22%]',
		delay: 0.68,
		tone: 'blue' as const,
	},
	{
		label: 'Ghost link',
		className: 'left-[44%] top-[46%] w-[18%]',
		delay: 0.78,
		tone: 'ghost' as const,
	},
] as const;

const connectors = [
	{
		className: 'left-[34%] top-[22%] w-[26%] rotate-[8deg]',
		delay: 0.34,
		tone: 'blue' as const,
	},
	{
		className: 'left-[33%] top-[46%] w-[30%] rotate-[-5deg]',
		delay: 0.45,
		tone: 'coral' as const,
	},
	{
		className: 'left-[36%] top-[69%] w-[26%] rotate-[10deg]',
		delay: 0.56,
		tone: 'blue' as const,
	},
	{
		className: 'left-[55%] top-[55%] w-[18%] rotate-[55deg]',
		delay: 0.88,
		tone: 'blue' as const,
	},
] as const;

const cursors = [
	{
		label: 'Ava',
		className: 'right-[27%] top-[29%]',
		delay: 0.95,
	},
	{
		label: 'Kai',
		className: 'right-[17%] top-[59%]',
		delay: 1.05,
	},
] as const;

const legendItems = [
	{ icon: Keyboard, label: 'Capture fast' },
	{ icon: Sparkles, label: 'Link in context' },
	{ icon: Users, label: 'Share live' },
] as const;

function SceneCard({
	title,
	body,
	className,
	delay,
	shouldReduceMotion,
}: {
	title: string;
	body: string;
	className: string;
	delay: number;
	shouldReduceMotion: boolean;
}) {
	return (
		<motion.div
			className={`absolute rounded-2xl bg-[linear-gradient(180deg,rgba(17,21,31,0.88),rgba(11,14,20,0.78))] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-white/6 ${className}`}
			initial={
				shouldReduceMotion
					? { opacity: 1, y: 0 }
					: { opacity: 0, y: 18, scale: 0.96 }
			}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: { duration: 0.45, delay, ease: EASE_OUT_QUART }
			}
		>
			<div className='mb-3 flex items-center gap-1.5'>
				<span className='h-1.5 w-1.5 rounded-full bg-brand-coral/80' />
				<span className='h-1.5 w-1.5 rounded-full bg-primary-400/70' />
				<span className='h-1.5 w-1.5 rounded-full bg-white/30' />
			</div>
			<p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary'>
				{title}
			</p>
			<p className='mt-2 text-sm font-medium leading-snug text-text-primary'>
				{body}
			</p>
		</motion.div>
	);
}

function SceneNode({
	label,
	className,
	delay,
	tone,
	shouldReduceMotion,
}: {
	label: string;
	className: string;
	delay: number;
	shouldReduceMotion: boolean;
	tone: 'blue' | 'coral' | 'ghost';
}) {
	const toneClasses =
		tone === 'coral'
			? 'bg-brand-coral/[0.11] text-brand-coral ring-1 ring-inset ring-brand-coral/22'
			: tone === 'ghost'
				? 'border border-dashed border-primary-400/24 bg-primary-500/[0.08] text-primary-200'
				: 'bg-primary-500/[0.11] text-primary-100 ring-1 ring-inset ring-primary-400/20';

	return (
		<motion.div
			className={`absolute rounded-2xl px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.2)] ${toneClasses} ${className}`}
			initial={
				shouldReduceMotion
					? { opacity: 1, scale: 1 }
					: { opacity: 0, scale: 0.9, y: 10 }
			}
			animate={
				tone === 'ghost' && !shouldReduceMotion
					? {
							opacity: 1,
							scale: 1,
							y: 0,
							boxShadow: [
								'0 0 0 rgba(96,165,250,0.00)',
								'0 0 28px rgba(96,165,250,0.18)',
								'0 0 0 rgba(96,165,250,0.00)',
							],
						}
					: { opacity: 1, scale: 1, y: 0 }
			}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: tone === 'ghost'
						? {
								duration: 0.55,
								delay,
								ease: EASE_OUT_QUART,
								boxShadow: {
									duration: 3,
									delay: delay + 0.35,
									repeat: Infinity,
									ease: 'easeInOut',
								},
							}
						: { duration: 0.55, delay, ease: EASE_OUT_QUART }
			}
		>
			<p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48'>
				{tone === 'ghost' ? 'AI suggestion' : 'Map node'}
			</p>
			<p className='mt-2 text-sm font-semibold leading-snug text-inherit'>
				{label}
			</p>
		</motion.div>
	);
}

function SceneConnector({
	className,
	delay,
	tone,
	shouldReduceMotion,
}: {
	className: string;
	delay: number;
	shouldReduceMotion: boolean;
	tone: 'blue' | 'coral';
}) {
	const background =
		tone === 'coral'
			? 'linear-gradient(90deg, rgba(224,133,106,0.04), rgba(224,133,106,0.55), rgba(224,133,106,0.04))'
			: 'linear-gradient(90deg, rgba(96,165,250,0.04), rgba(96,165,250,0.55), rgba(96,165,250,0.04))';

	return (
		<motion.div
			className={`absolute h-px origin-left rounded-full md:h-[2px] ${className}`}
			style={{ background }}
			initial={
				shouldReduceMotion
					? { opacity: 1, scaleX: 1 }
					: { opacity: 0, scaleX: 0.2 }
			}
			animate={{ opacity: 1, scaleX: 1 }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: { duration: 0.5, delay, ease: EASE_OUT_QUART }
			}
		/>
	);
}

export function HeroMapScene() {
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<div className='relative mx-auto w-full max-w-[38rem]'>
			<div className='absolute inset-x-[10%] top-[10%] h-36 rounded-full bg-primary-500/18 blur-3xl' />
			<div className='absolute bottom-[8%] left-[8%] h-32 w-40 rounded-full bg-brand-coral/10 blur-3xl' />

			<div className='relative aspect-[1.08] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,14,20,0.96),rgba(8,10,16,0.88))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.42)] md:p-5'>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(224,133,106,0.09),transparent_28%),radial-gradient(circle_at_86%_20%,rgba(96,165,250,0.18),transparent_34%),radial-gradient(circle_at_58%_72%,rgba(96,165,250,0.10),transparent_24%)]' />
				<div className='absolute inset-0 bg-[url("/grid.svg")] bg-[length:72px_72px] opacity-[0.08] [mask-image:linear-gradient(180deg,black,rgba(0,0,0,0.35))]' />

				<div className='absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-secondary backdrop-blur-md'>
					<span className='h-1.5 w-1.5 rounded-full bg-primary-400' />
					Thoughts becoming structure
				</div>

				{captureCards.map((card) => (
					<SceneCard
						key={card.title}
						title={card.title}
						body={card.body}
						className={card.className}
						delay={card.delay}
						shouldReduceMotion={shouldReduceMotion}
					/>
				))}

				{connectors.map((connector, index) => (
					<SceneConnector
						key={`${connector.className}-${index}`}
						className={connector.className}
						delay={connector.delay}
						tone={connector.tone}
						shouldReduceMotion={shouldReduceMotion}
					/>
				))}

				{mapNodes.map((node) => (
					<SceneNode
						key={node.label}
						label={node.label}
						className={node.className}
						delay={node.delay}
						tone={node.tone}
						shouldReduceMotion={shouldReduceMotion}
					/>
				))}

				{cursors.map((cursor) => (
					<motion.div
						key={cursor.label}
						className={`absolute z-20 inline-flex items-center gap-2 rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-inset ring-white/6 backdrop-blur-md ${cursor.className}`}
						initial={
							shouldReduceMotion
								? { opacity: 1, scale: 1 }
								: { opacity: 0, scale: 0.94, y: 6 }
						}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.4, delay: cursor.delay, ease: EASE_OUT_QUART }
						}
					>
						<span className='h-2 w-2 rounded-full bg-primary-400' />
						{cursor.label}
					</motion.div>
				))}

				<div className='absolute inset-x-4 bottom-4 z-10 rounded-[1.2rem] bg-black/18 px-2 py-2 backdrop-blur-md md:inset-x-5 md:bottom-5'>
					<div className='grid grid-cols-3 divide-x divide-white/8'>
						{legendItems.map((item, index) => {
							const Icon = item.icon;

							return (
								<motion.div
									key={item.label}
									className='px-3 py-3 text-center'
									initial={
										shouldReduceMotion
											? { opacity: 1, y: 0 }
											: { opacity: 0, y: 12 }
									}
									animate={{ opacity: 1, y: 0 }}
									transition={
										shouldReduceMotion
											? { duration: 0 }
											: {
													duration: 0.4,
													delay: 0.8 + index * 0.12,
													ease: EASE_OUT_QUART,
												}
									}
								>
									<Icon
										aria-hidden='true'
										className='mx-auto h-4 w-4 text-primary-300'
									/>
									<p className='mt-2 text-xs font-medium text-text-secondary'>
										{item.label}
									</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
