'use client';

import { Keyboard, Sparkles, Users } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { GrainOverlay } from './grain-overlay';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const workflowSteps = [
	{
		icon: Keyboard,
		title: 'Capture in fragments',
		description:
			'Write loose notes, tags, and actions without stopping to format the canvas.',
	},
	{
		icon: Sparkles,
		title: 'Watch structure emerge',
		description:
			'AI suggestions stay inside the map, so links appear while the idea is still fresh.',
	},
	{
		icon: Users,
		title: 'Share the live thinking',
		description:
			'Invite collaborators into the same evolving map instead of sending static exports.',
	},
] as const;

const payoffPoints = [
	'Solo speed without losing shared context',
	'AI assistance without a separate workflow',
	'One canvas from first note to team alignment',
] as const;

export function ProblemSolution() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section
			id='problem'
			ref={ref}
			className='relative bg-background px-4 py-16 sm:px-6 lg:px-8 lg:py-20'
		>
			<GrainOverlay />
			<div className='relative z-10 mx-auto max-w-6xl'>
				<motion.div
					initial={
						shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }
					}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { duration: 0.5, ease: EASE_OUT_QUART }
					}
					className='overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,30,0.9),rgba(10,12,18,0.82))] shadow-[0_20px_70px_rgba(0,0,0,0.28)]'
				>
					<div className='grid gap-10 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-14'>
						<div className='max-w-2xl'>
							<p className='text-xs font-medium uppercase tracking-[0.28em] text-primary-300/70'>
								Thoughts becoming structure
							</p>
							<h2 className='mt-4 max-w-[15ch] text-balance font-lora text-3xl font-bold leading-[1.08] tracking-tight text-text-primary md:text-5xl'>
								Thinking starts messy. Shiko shapes it before the thread goes
								cold.
							</h2>
							<p className='mt-5 max-w-[38rem] text-pretty text-base leading-7 text-text-secondary md:text-lg'>
								Keep the speed of rough notes, add AI only where it helps, and
								bring teammates into the same map before a handoff becomes
								another bottleneck.
							</p>

							<div className='mt-8 flex flex-wrap gap-3'>
								{payoffPoints.map((point, index) => (
									<motion.div
										key={point}
										initial={
											shouldReduceMotion
												? { opacity: 1, y: 0 }
												: { opacity: 0, y: 10 }
										}
										animate={isInView ? { opacity: 1, y: 0 } : {}}
										transition={
											shouldReduceMotion
												? { duration: 0 }
												: {
														duration: 0.32,
														delay: 0.14 + index * 0.08,
														ease: EASE_OUT_QUART,
													}
										}
										className='rounded-full bg-white/[0.05] px-4 py-2 text-sm text-text-secondary ring-1 ring-inset ring-white/6'
									>
										{point}
									</motion.div>
								))}
							</div>
						</div>

						<div className='lg:pt-2'>
							<div className='space-y-5'>
								{workflowSteps.map((step, index) => {
									const Icon = step.icon;

									return (
										<motion.div
											key={step.title}
											initial={
												shouldReduceMotion
													? { opacity: 1, x: 0 }
													: { opacity: 0, x: 14 }
											}
											animate={isInView ? { opacity: 1, x: 0 } : {}}
											transition={
												shouldReduceMotion
													? { duration: 0 }
													: {
															duration: 0.36,
															delay: 0.16 + index * 0.1,
															ease: EASE_OUT_QUART,
														}
											}
											className='border-b border-white/8 pb-5 last:border-b-0 last:pb-0'
										>
											<div className='flex items-start gap-4'>
												<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-300 ring-1 ring-inset ring-primary-400/18'>
													<Icon aria-hidden='true' className='h-4 w-4' />
												</div>
												<div className='max-w-sm'>
													<p className='text-base font-semibold text-text-primary'>
														{index + 1}. {step.title}
													</p>
													<p className='mt-2 text-sm leading-6 text-text-secondary md:text-[0.97rem]'>
														{step.description}
													</p>
												</div>
											</div>
										</motion.div>
									);
								})}
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
