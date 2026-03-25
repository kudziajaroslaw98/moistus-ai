'use client';

import { MoveRight, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';

function IntroStep({
	description,
	index,
	title,
}: {
	description: string;
	index: string;
	title: string;
}) {
	return (
		<div className='flex items-start gap-3'>
			<div className='inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-300'>
				{index}
			</div>
			<div>
				<p className='text-sm font-medium text-text-primary'>{title}</p>
				<p className='mt-1 text-xs leading-5 text-text-secondary'>
					{description}
				</p>
			</div>
		</div>
	);
}

function OnboardingValueCard({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<div className='rounded-3xl border border-white/10 bg-white/[0.04] p-4'>
			<h3 className='text-sm font-semibold text-text-primary'>{title}</h3>
			<p className='mt-2 text-xs leading-5 text-text-secondary'>
				{description}
			</p>
		</div>
	);
}

export function IntroOverlay({
	isMobile,
	onSkip,
	onStart,
}: {
	isMobile: boolean;
	onSkip: () => void;
	onStart: () => void;
}) {
	if (isMobile) {
		return (
			<motion.div
				animate={{ opacity: 1 }}
				className='fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm'
				data-testid='onboarding-intro'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
			>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='w-full overflow-hidden rounded-t-[2rem] border border-white/12 bg-base/96 shadow-2xl shadow-black/35'
					exit={{ opacity: 0, y: 24 }}
					initial={{ opacity: 0, y: 32 }}
				>
					<div className='space-y-5 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]'>
						<div className='mx-auto h-1.5 w-12 rounded-full bg-white/12' />

						<div className='inline-flex items-center gap-2 rounded-full border border-primary-500/25 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300'>
							<span className='size-2 rounded-full bg-primary-400' />
							Start inside the canvas
						</div>

						<div className='space-y-2'>
							<h2 className='text-2xl font-semibold tracking-tight text-text-primary'>
								Three quick moves to get comfortable fast.
							</h2>
							<p className='text-sm leading-6 text-text-secondary'>
								Place a node, try one structured line, then learn the controls
								you will actually use on the phone.
							</p>
						</div>

						<div className='space-y-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4'>
							<IntroStep
								description='Tap Add Node, then tap empty canvas.'
								index='1'
								title='Create a node'
							/>
							<IntroStep
								description='See how one line becomes a richer node.'
								index='2'
								title='Try a pattern'
							/>
							<IntroStep
								description='Learn the visible controls and where the rest live.'
								index='3'
								title='Know the controls'
							/>
						</div>

						<div className='grid gap-2'>
							<Button
								className='w-full justify-between gap-2'
								onClick={onStart}
								size='md'
								variant='default'
							>
								<span className='flex items-center gap-2'>
									<Play className='size-4' />
									Start walkthrough
								</span>
								<MoveRight className='size-4' />
							</Button>
							<Button
								className='w-full'
								onClick={onSkip}
								size='md'
								variant='secondary'
							>
								Skip walkthrough
							</Button>
						</div>
					</div>
				</motion.div>
			</motion.div>
		);
	}

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className='fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm'
			data-testid='onboarding-intro'
			exit={{ opacity: 0 }}
			initial={{ opacity: 0 }}
		>
			<motion.div
				animate={{ opacity: 1, y: 0, scale: 1 }}
				className='w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/12 bg-base/95 shadow-2xl shadow-black/35'
				exit={{ opacity: 0, y: 12, scale: 0.98 }}
				initial={{ opacity: 0, y: 24, scale: 0.98 }}
			>
				<div className='grid gap-0 md:grid-cols-[1.35fr_0.95fr]'>
					<div className='relative overflow-hidden p-6 sm:p-8'>
						<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_38%)]' />
						<div className='relative space-y-5'>
							<div className='inline-flex items-center gap-2 rounded-full border border-primary-500/25 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300'>
								<span className='size-2 rounded-full bg-primary-400' />
								Start inside the canvas
							</div>

							<div className='space-y-3'>
								<h2 className='max-w-2xl text-3xl font-semibold tracking-tight text-text-primary sm:text-[2.5rem] sm:leading-[1.05]'>
									Start with three useful moves, not a wall of features.
								</h2>
								<p className='max-w-2xl text-sm leading-6 text-text-secondary sm:text-base'>
									We&apos;ll help you place a node, try one structured line, and
									learn where the controls you&apos;ll actually use live.
								</p>
							</div>

							<div className='grid gap-3 sm:grid-cols-3'>
								<OnboardingValueCard
									description='Drop a node on the canvas and start shaping the map where you think.'
									title='Place ideas visually'
								/>
								<OnboardingValueCard
									description='Use patterns like #tag, ^tomorrow, and $task without leaving your flow.'
									title='Add structure lightly'
								/>
								<OnboardingValueCard
									description='See the core controls now, then keep exploring naturally as the map grows.'
									title='Keep moving quickly'
								/>
							</div>
						</div>
					</div>

					<div className='border-t border-white/10 bg-white/[0.03] p-6 sm:p-8 md:border-l md:border-t-0'>
						<div className='flex h-full flex-col justify-between gap-6'>
							<div>
								<p className='text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary'>
									What happens next
								</p>
								<div className='mt-4 space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4'>
									<IntroStep
										description='Choose add mode, then click empty canvas.'
										index='1'
										title='Add a node'
									/>
									<IntroStep
										description='See how one line turns into a richer node.'
										index='2'
										title='Try a pattern'
									/>
									<IntroStep
										description='Get a quick pass over the toolbar, sharing, and navigation.'
										index='3'
										title='Learn the core controls'
									/>
								</div>
							</div>

							<div className='space-y-3'>
								<Button
									className='w-full justify-between gap-2'
									onClick={onStart}
									size='md'
									variant='default'
								>
									<span className='flex items-center gap-2'>
										<Play className='size-4' />
										Start walkthrough
									</span>
									<MoveRight className='size-4' />
								</Button>
								<Button
									className='w-full'
									onClick={onSkip}
									size='md'
									variant='secondary'
								>
									Skip walkthrough
								</Button>
							</div>
						</div>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}
