'use client';

import {
	ONBOARDING_PATTERN_EXAMPLE,
	getOnboardingCoachmarks,
	type OnboardingCoachmark,
	type OnboardingTaskId,
} from '@/constants/onboarding';
import { useIsMobile } from '@/hooks/use-mobile';
import useAppStore from '@/store/mind-map-store';
import { AnimatePresence, motion } from 'motion/react';
import {
	Check,
	Circle,
	Minimize2,
	MoveRight,
	Play,
	Sparkles,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';

interface FloatingTargetRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

const CANVAS_SAFE_OFFSET =
	'calc(env(safe-area-inset-bottom, 0px) + var(--mind-map-toolbar-clearance, 0px) + 1rem)';
const MOBILE_TOP_CHIP_OFFSET =
	'calc(env(safe-area-inset-top, 0px) + 4.5rem)';

function IntroOverlay({
	isMobile,
	onExplore,
	onStart,
}: {
	isMobile: boolean;
	onExplore: () => void;
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
								onClick={onExplore}
								size='md'
								variant='secondary'
							>
								Explore on my own
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
									We&apos;ll help you place a node, try one structured line,
									and learn where the controls you&apos;ll actually use live.
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
									onClick={onExplore}
									size='md'
									variant='secondary'
								>
									Explore on my own
								</Button>
							</div>
						</div>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}

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
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className='rounded-3xl border border-white/10 bg-white/[0.04] p-4'>
			<h3 className='text-sm font-semibold text-text-primary'>{title}</h3>
			<p className='mt-2 text-xs leading-5 text-text-secondary'>{description}</p>
		</div>
	);
}

function ChecklistCard({
	completedCount,
	isMobile,
	onMinimize,
	onTaskAction,
	tasks,
}: {
	completedCount: number;
	isMobile: boolean;
	onMinimize: () => void;
	onTaskAction: (taskId: OnboardingTaskId) => void;
	tasks: Record<OnboardingTaskId, boolean>;
}) {
	return (
		<motion.div
			animate={{ opacity: 1, x: 0, y: 0 }}
			className={
				isMobile
					? 'fixed inset-x-4 z-[60] rounded-[1.75rem] border border-white/10 bg-base/96 p-4 shadow-2xl shadow-black/35 backdrop-blur-md'
					: 'fixed right-4 top-24 z-[60] w-[min(360px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-base/96 p-4 shadow-2xl shadow-black/35 backdrop-blur-md'
			}
			data-testid='onboarding-checklist'
			exit={isMobile ? { opacity: 0, y: 12 } : { opacity: 0, x: 24 }}
			initial={isMobile ? { opacity: 0, y: 12 } : { opacity: 0, x: 24 }}
			style={isMobile ? { bottom: CANVAS_SAFE_OFFSET } : undefined}
		>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<p className='text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary'>
						Getting Started
					</p>
					<h3 className='mt-1 text-lg font-semibold text-text-primary'>
						{completedCount}/3 complete
					</h3>
				</div>

				<button
					className='rounded-lg p-2 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text-primary'
					onClick={onMinimize}
					type='button'
				>
					<Minimize2 className='size-4' />
					<span className='sr-only'>Minimize walkthrough</span>
				</button>
			</div>

			<div className='mt-4 space-y-3'>
				<ChecklistItem
					completed={tasks['create-node']}
					description='Place your first node on the canvas.'
					label='Create a node'
					onClick={() => onTaskAction('create-node')}
				/>
				<ChecklistItem
					completed={tasks['try-pattern']}
					description='Turn one line into structure with tags, dates, or tasks.'
					label='Try a pattern'
					onClick={() => onTaskAction('try-pattern')}
				/>
				<ChecklistItem
					completed={tasks['know-controls']}
					description='See the tools you will use most often.'
					label='Know the controls'
					onClick={() => onTaskAction('know-controls')}
				/>
			</div>
		</motion.div>
	);
}

function ChecklistItem({
	completed,
	description,
	label,
	onClick,
}: {
	completed: boolean;
	description: string;
	label: string;
	onClick: () => void;
}) {
	return (
		<div className='rounded-2xl border border-white/8 bg-white/3 p-3'>
			<div className='flex items-start gap-3'>
				<div className='pt-0.5 text-primary-300'>
					{completed ? (
						<span className='inline-flex size-5 items-center justify-center rounded-full bg-primary-500/15'>
							<Check className='size-3.5' />
						</span>
					) : (
						<Circle className='size-5 text-text-tertiary' />
					)}
				</div>

				<div className='min-w-0 flex-1'>
					<div className='flex items-center justify-between gap-3'>
						<h4 className='text-sm font-medium text-text-primary'>{label}</h4>
						<Button
							onClick={onClick}
							size='sm'
							variant={completed ? 'secondary' : 'default'}
						>
							{completed ? 'Done' : 'Start'}
						</Button>
					</div>
					<p className='mt-1 text-xs leading-5 text-text-secondary'>
						{description}
					</p>
				</div>
			</div>
		</div>
	);
}

function FloatingHint({
	dataTestId,
	description,
	isMobile,
	mobileDescription,
	mobileTitle,
	onDismiss,
	targetRect,
	title,
}: {
	dataTestId?: string;
	description: string;
	isMobile: boolean;
	mobileDescription?: string;
	mobileTitle?: string;
	onDismiss: () => void;
	targetRect: FloatingTargetRect | null;
	title: string;
}) {
	const floatingStyle = useMemo(() => {
		if (isMobile || !targetRect || typeof window === 'undefined') {
			return null;
		}

		const cardWidth = Math.min(320, window.innerWidth - 32);
		const gap = 20;
		const prefersRight =
			targetRect.left + targetRect.width + gap + cardWidth <
			window.innerWidth - 16;
		const left = prefersRight
			? targetRect.left + targetRect.width + gap
			: Math.max(16, targetRect.left - cardWidth - gap);
		const top = Math.max(
			96,
			Math.min(
				targetRect.top + targetRect.height / 2 - 90,
				window.innerHeight - 220
			)
		);

		return {
			left,
			top,
			width: cardWidth,
		};
	}, [isMobile, targetRect]);

	if (!isMobile && floatingStyle) {
		return (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='fixed z-[58] rounded-2xl border border-primary-500/25 bg-base/95 p-4 shadow-xl shadow-black/35 backdrop-blur-md'
				data-testid={dataTestId}
				exit={{ opacity: 0, y: 8 }}
				initial={{ opacity: 0, y: 8 }}
				style={floatingStyle}
			>
				<div className='flex items-start justify-between gap-3'>
					<div>
						<p className='text-sm font-semibold text-text-primary'>{title}</p>
						<p className='mt-1 text-xs leading-5 text-text-secondary'>
							{description}
						</p>
					</div>

					<button
						className='rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text-primary'
						onClick={onDismiss}
						type='button'
					>
						<X className='size-4' />
						<span className='sr-only'>Hide hint</span>
					</button>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className='fixed inset-x-4 z-[58] rounded-[1.5rem] border border-primary-500/25 bg-base/95 p-4 shadow-xl shadow-black/35 backdrop-blur-md'
			data-testid={dataTestId}
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
			style={{ bottom: CANVAS_SAFE_OFFSET }}
		>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<p className='text-sm font-semibold text-text-primary'>
						{mobileTitle ?? title}
					</p>
					<p className='mt-1 text-xs leading-5 text-text-secondary'>
						{mobileDescription ?? description}
					</p>
				</div>

				<button
					className='rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text-primary'
					onClick={onDismiss}
					type='button'
				>
					<X className='size-4' />
					<span className='sr-only'>Hide hint</span>
				</button>
			</div>
		</motion.div>
	);
}

function CanvasPlacementHint({
	isMobile,
	onDismiss,
}: {
	isMobile: boolean;
	onDismiss: () => void;
}) {
	const desktopStyle = {
		top: 112,
		left: 24,
		right: 392,
		maxWidth: 420,
	};

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className='fixed z-[58] w-[min(420px,calc(100vw-2rem))] rounded-3xl border border-primary-500/25 bg-base/95 p-4 shadow-xl shadow-black/35 backdrop-blur-md'
			data-testid='onboarding-canvas-hint'
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
			style={
				isMobile
					? { left: 16, right: 16, bottom: CANVAS_SAFE_OFFSET }
					: desktopStyle
			}
		>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<p className='text-sm font-semibold text-text-primary'>
						{isMobile ? 'Tap empty canvas' : 'Now click empty canvas'}
					</p>
					<p className='mt-1 text-xs leading-5 text-text-secondary'>
						Shiko will place your new node where you{' '}
						{isMobile ? 'tap' : 'click'}. You can also grow from a selected
						node with its <span className='font-medium'>+</span> button, or use{' '}
						<span className='font-medium'>Ctrl/Cmd + Arrow</span> if you have a
						keyboard attached.
					</p>
				</div>

				<button
					className='rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text-primary'
					onClick={onDismiss}
					type='button'
				>
					<X className='size-4' />
					<span className='sr-only'>Hide hint</span>
				</button>
			</div>
		</motion.div>
	);
}

function CoachmarkCard({
	currentStep,
	isLastStep,
	isMobile,
	onMinimize,
	onNext,
	targetRect,
}: {
	currentStep: OnboardingCoachmark;
	isLastStep: boolean;
	isMobile: boolean;
	onMinimize: () => void;
	onNext: () => void;
	targetRect: FloatingTargetRect | null;
}) {
	const floatingStyle = useMemo(() => {
		if (isMobile || !targetRect || typeof window === 'undefined') {
			return null;
		}

		const cardWidth = Math.min(360, window.innerWidth - 32);
		const cardHeight = 220;
		const gap = 28;
		const left = Math.max(
			16,
			Math.min(
				targetRect.left + targetRect.width / 2 - cardWidth / 2,
				window.innerWidth - cardWidth - 16
			)
		);
		const prefersAbove =
			targetRect.top + targetRect.height / 2 > window.innerHeight * 0.52;
		const top = prefersAbove
			? Math.max(96, targetRect.top - cardHeight - gap)
			: Math.max(
					96,
					Math.min(
						targetRect.top + targetRect.height + gap,
						window.innerHeight - 250
					)
				);

		return {
			left,
			top,
			width: cardWidth,
		};
	}, [isMobile, targetRect]);

	const content = (
		<div className='rounded-3xl border border-white/10 bg-base/96 p-5 shadow-2xl shadow-black/35 backdrop-blur-md'>
			<p className='text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary'>
				Controls Tour
			</p>
			<h3 className='mt-2 text-lg font-semibold text-text-primary'>
				{currentStep.title}
			</h3>
			<p className='mt-2 text-sm leading-6 text-text-secondary'>
				{currentStep.description}
			</p>

			<div className='mt-4 flex items-center justify-between gap-3'>
				<Button onClick={onMinimize} size='sm' variant='secondary'>
					Pause
				</Button>
				<Button className='gap-2' onClick={onNext} size='sm' variant='default'>
					{isLastStep ? 'Finish tour' : 'Next'}
					<MoveRight className='size-4' />
				</Button>
			</div>
		</div>
	);

	if (!isMobile && floatingStyle) {
		return (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='fixed z-[60]'
				data-testid='onboarding-coachmark'
				exit={{ opacity: 0, y: 8 }}
				initial={{ opacity: 0, y: 8 }}
				style={floatingStyle}
			>
				{content}
			</motion.div>
		);
	}

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className='fixed inset-x-4 z-[60]'
			data-testid='onboarding-coachmark'
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
			style={{ bottom: CANVAS_SAFE_OFFSET }}
		>
			{content}
		</motion.div>
	);
}

function UpsellCard({
	isMobile,
	onKeepUsingFree,
	onSeePlans,
}: {
	isMobile: boolean;
	onKeepUsingFree: () => void;
	onSeePlans: () => void;
}) {
	return (
		<motion.div
			animate={{ opacity: 1, x: 0, y: 0 }}
			className={
				isMobile
					? 'fixed inset-x-4 z-[60] rounded-[1.75rem] border border-white/10 bg-base/96 p-5 shadow-2xl shadow-black/35 backdrop-blur-md'
					: 'fixed right-4 top-24 z-[60] w-[min(380px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-base/96 p-5 shadow-2xl shadow-black/35 backdrop-blur-md'
			}
			data-testid='onboarding-upsell'
			exit={isMobile ? { opacity: 0, y: 12 } : { opacity: 0, y: 12 }}
			initial={isMobile ? { opacity: 0, y: 12 } : { opacity: 0, y: 12 }}
			style={isMobile ? { bottom: CANVAS_SAFE_OFFSET } : undefined}
		>
			<div className='inline-flex items-center gap-2 rounded-full border border-primary-500/25 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300'>
				<Sparkles className='size-3.5' />
				Optional next step
			</div>
			<h3 className='mt-3 text-xl font-semibold text-text-primary'>
				You know enough to keep going.
			</h3>
			<p className='mt-2 text-sm leading-6 text-text-secondary'>
				If you want more AI depth, larger maps, and stronger collaboration
				limits later, the Pro plan is there. If not, keep building.
			</p>

			<div className='mt-5 flex flex-col gap-3 sm:flex-row'>
				<Button onClick={onKeepUsingFree} size='md' variant='secondary'>
					Keep using Free
				</Button>
				<Button className='gap-2' onClick={onSeePlans} size='md' variant='default'>
					See Pro plans
					<MoveRight className='size-4' />
				</Button>
			</div>
		</motion.div>
	);
}

function MinimizedPill({
	completedCount,
	isMobile,
	onResume,
}: {
	completedCount: number;
	isMobile: boolean;
	onResume: () => void;
}) {
	return (
		<motion.button
			animate={{ opacity: 1, y: 0 }}
			className={
				isMobile
					? 'fixed left-4 z-[55] flex items-center gap-3 rounded-full border border-white/10 bg-base/95 px-4 py-2.5 text-sm text-text-primary shadow-xl shadow-black/30 backdrop-blur-md'
					: 'fixed left-4 z-[55] flex items-center gap-3 rounded-full border border-white/10 bg-base/95 px-4 py-3 text-sm text-text-primary shadow-xl shadow-black/30 backdrop-blur-md'
			}
			data-testid='onboarding-minimized-pill'
			initial={{ opacity: 0, y: 10 }}
			onClick={onResume}
			style={isMobile ? { top: MOBILE_TOP_CHIP_OFFSET } : { bottom: CANVAS_SAFE_OFFSET }}
			type='button'
			whileTap={{ scale: 0.98 }}
		>
			<span className='inline-flex size-7 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-300'>
				{completedCount}/3
			</span>
			<span>Resume walkthrough</span>
		</motion.button>
	);
}

export function OnboardingModal() {
	const isMobile = useIsMobile();
	const [targetRect, setTargetRect] = useState<FloatingTargetRect | null>(null);
	const {
		onboardingStatus,
		onboardingTasks,
		onboardingActiveTarget,
		onboardingCoachmarkStep,
		onboardingIsMinimized,
		onboardingCreateNodeStep,
		onboardingPatternStep,
		onboardingHighlightedNodeId,
		onboardingViewport,
		hasCompletedOnboarding,
		currentSubscription,
		startOnboarding,
		exploreOnboardingIndependently,
		resumeOnboarding,
		minimizeOnboarding,
		startOnboardingTask,
		advanceOnboardingCoachmark,
		completeOnboarding,
		dismissOnboardingPatternEditHint,
		openNodeEditor,
		reactFlowInstance,
		setOnboardingViewport,
		setPopoverOpen,
	} = useAppStore(
		useShallow((state) => ({
			onboardingStatus: state.onboardingStatus,
			onboardingTasks: state.onboardingTasks,
			onboardingActiveTarget: state.onboardingActiveTarget,
			onboardingCoachmarkStep: state.onboardingCoachmarkStep,
			onboardingIsMinimized: state.onboardingIsMinimized,
			onboardingCreateNodeStep: state.onboardingCreateNodeStep,
			onboardingPatternStep: state.onboardingPatternStep,
			onboardingHighlightedNodeId: state.onboardingHighlightedNodeId,
			onboardingViewport: state.onboardingViewport,
			hasCompletedOnboarding: state.hasCompletedOnboarding,
			currentSubscription: state.currentSubscription,
			startOnboarding: state.startOnboarding,
			exploreOnboardingIndependently: state.exploreOnboardingIndependently,
			resumeOnboarding: state.resumeOnboarding,
			minimizeOnboarding: state.minimizeOnboarding,
			startOnboardingTask: state.startOnboardingTask,
			advanceOnboardingCoachmark: state.advanceOnboardingCoachmark,
			completeOnboarding: state.completeOnboarding,
			dismissOnboardingPatternEditHint: state.dismissOnboardingPatternEditHint,
			openNodeEditor: state.openNodeEditor,
			reactFlowInstance: state.reactFlowInstance,
			setOnboardingViewport: state.setOnboardingViewport,
			setPopoverOpen: state.setPopoverOpen,
		}))
	);

	const completedCount = useMemo(
		() => Object.values(onboardingTasks).filter(Boolean).length,
		[onboardingTasks]
	);
	const isProUser =
		currentSubscription?.plan?.name === 'pro' &&
		['active', 'trialing'].includes(currentSubscription?.status ?? '');
	const shouldRenderMinimizedPill =
		onboardingIsMinimized && !hasCompletedOnboarding;
	const shouldRenderChecklist = onboardingStatus === 'checklist';
	const shouldRenderUpsell = onboardingStatus === 'upsell' && !isProUser;
	const shouldRenderIntro = onboardingStatus === 'intro';
	const shouldRenderCreateNodeToolbarHint =
		shouldRenderChecklist &&
		!onboardingTasks['create-node'] &&
		onboardingCreateNodeStep !== 'canvas';
	const shouldRenderCanvasHint =
		shouldRenderChecklist &&
		!onboardingTasks['create-node'] &&
		onboardingCreateNodeStep === 'canvas';
	const shouldRenderPatternEditHint =
		shouldRenderChecklist &&
		onboardingPatternStep === 'post-create-edit-hint' &&
		Boolean(onboardingHighlightedNodeId);
	const coachmarks = useMemo(
		() => getOnboardingCoachmarks(onboardingViewport),
		[onboardingViewport]
	);
	const currentCoachmark = coachmarks[onboardingCoachmarkStep] ?? null;
	const shouldHideChecklistForMobileSurface =
		isMobile &&
		(shouldRenderCreateNodeToolbarHint ||
			shouldRenderCanvasHint ||
			shouldRenderPatternEditHint ||
			onboardingStatus === 'coachmarks');
	const shouldRenderChecklistCard =
		shouldRenderChecklist && !shouldHideChecklistForMobileSurface;

	useEffect(() => {
		setOnboardingViewport(isMobile ? 'mobile' : 'desktop');
	}, [isMobile, setOnboardingViewport]);

	useEffect(() => {
		if (
			!onboardingActiveTarget ||
			onboardingStatus === 'intro' ||
			onboardingStatus === 'upsell'
		) {
			setTargetRect(null);
			return;
		}

		let animationFrame = 0;
		const updateTargetRect = () => {
			const target =
				onboardingActiveTarget === 'created-node' && onboardingHighlightedNodeId
					? document.querySelector<HTMLElement>(
							`[data-id="${onboardingHighlightedNodeId}"]`
						)
					: document.querySelector<HTMLElement>(
							`[data-onboarding-target="${onboardingActiveTarget}"]`
						);

			if (!target) {
				setTargetRect(null);
				return;
			}

			const rect = target.getBoundingClientRect();
			setTargetRect({
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
			});
		};

		const scheduleUpdate = () => {
			cancelAnimationFrame(animationFrame);
			animationFrame = window.requestAnimationFrame(updateTargetRect);
		};

		scheduleUpdate();
		window.addEventListener('resize', scheduleUpdate);
		window.addEventListener('scroll', scheduleUpdate, true);

		return () => {
			cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', scheduleUpdate);
			window.removeEventListener('scroll', scheduleUpdate, true);
		};
	}, [
		onboardingActiveTarget,
		onboardingHighlightedNodeId,
		onboardingStatus,
	]);

	const openPatternLesson = useCallback(() => {
		const screenPosition =
			typeof window === 'undefined'
				? { x: 0, y: 0 }
				: { x: window.innerWidth / 2, y: window.innerHeight / 2 };
		const position = reactFlowInstance
			? reactFlowInstance.screenToFlowPosition(screenPosition)
			: { x: 0, y: 0 };

		startOnboardingTask('try-pattern');
		openNodeEditor({
			mode: 'create',
			position,
			screenPosition,
			suggestedType: 'taskNode',
			initialValue: ONBOARDING_PATTERN_EXAMPLE,
			onboardingSource: 'onboarding-pattern',
		});
	}, [openNodeEditor, reactFlowInstance, startOnboardingTask]);

	const handleTaskAction = useCallback(
		(taskId: OnboardingTaskId) => {
			if (taskId === 'try-pattern') {
				openPatternLesson();
				return;
			}

			startOnboardingTask(taskId);
		},
		[openPatternLesson, startOnboardingTask]
	);

	const handleOpenUpgrade = useCallback(() => {
		completeOnboarding();
		setPopoverOpen({ upgradeUser: true });
	}, [completeOnboarding, setPopoverOpen]);

	const shouldRenderSpotlight =
		Boolean(targetRect) &&
		Boolean(onboardingActiveTarget) &&
		(onboardingStatus === 'coachmarks' ||
			(shouldRenderChecklist &&
				(onboardingActiveTarget === 'add-node' ||
					onboardingActiveTarget === 'created-node')));

	if (
		!shouldRenderIntro &&
		!shouldRenderChecklist &&
		!shouldRenderUpsell &&
		!shouldRenderMinimizedPill &&
		onboardingStatus !== 'coachmarks'
	) {
		return null;
	}

	return (
		<>
			{shouldRenderSpotlight && targetRect && (
				<div
					aria-hidden='true'
					className='pointer-events-none fixed z-[56] rounded-2xl border-2 border-primary-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)] shadow-primary-400/20 transition-all duration-200'
					style={{
						top: targetRect.top - 8,
						left: targetRect.left - 8,
						width: targetRect.width + 16,
						height: targetRect.height + 16,
					}}
				/>
			)}

			<AnimatePresence>
				{shouldRenderIntro && (
					<IntroOverlay
						isMobile={isMobile}
						onExplore={exploreOnboardingIndependently}
						onStart={startOnboarding}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderChecklistCard && (
					<ChecklistCard
						completedCount={completedCount}
						isMobile={isMobile}
						onMinimize={minimizeOnboarding}
						onTaskAction={handleTaskAction}
						tasks={onboardingTasks}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderCreateNodeToolbarHint && (
					<FloatingHint
						dataTestId='onboarding-create-node-hint'
						description='Start here. Choose Add Node, then the walkthrough will move onto the canvas with you.'
						isMobile={isMobile}
						mobileDescription='Tap Add Node to switch into placement mode. We will move onto the canvas as soon as you do.'
						mobileTitle='Create your first node'
						onDismiss={minimizeOnboarding}
						targetRect={targetRect}
						title='Create your first node'
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderCanvasHint && (
					<CanvasPlacementHint
						isMobile={isMobile}
						onDismiss={minimizeOnboarding}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderPatternEditHint && (
					<FloatingHint
						dataTestId='onboarding-pattern-edit-hint'
						description='To edit this node later, select it and press Enter, or just double-click it.'
						isMobile={isMobile}
						mobileDescription='Tap this node to select it. Once selected, use Edit to change it without leaving the canvas.'
						mobileTitle='Editing stays close by'
						onDismiss={dismissOnboardingPatternEditHint}
						targetRect={targetRect}
						title='Editing is one step away'
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{onboardingStatus === 'coachmarks' && currentCoachmark && (
					<CoachmarkCard
						currentStep={currentCoachmark}
						isLastStep={onboardingCoachmarkStep === coachmarks.length - 1}
						isMobile={isMobile}
						onMinimize={minimizeOnboarding}
						onNext={advanceOnboardingCoachmark}
						targetRect={targetRect}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderUpsell && (
					<UpsellCard
						isMobile={isMobile}
						onKeepUsingFree={completeOnboarding}
						onSeePlans={handleOpenUpgrade}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderMinimizedPill && (
					<MinimizedPill
						completedCount={completedCount}
						isMobile={isMobile}
						onResume={resumeOnboarding}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
