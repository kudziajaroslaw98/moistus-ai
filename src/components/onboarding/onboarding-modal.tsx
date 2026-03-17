'use client';

import {
	ONBOARDING_COACHMARKS,
	ONBOARDING_PATTERN_EXAMPLE,
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

function IntroOverlay({
	onExplore,
	onStart,
}: {
	onExplore: () => void;
	onStart: () => void;
}) {
	return (
		<motion.div
			animate={{ opacity: 1 }}
			className='fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm'
			exit={{ opacity: 0 }}
			initial={{ opacity: 0 }}
		>
			<motion.div
				animate={{ opacity: 1, y: 0, scale: 1 }}
				className='w-full max-w-2xl rounded-3xl border border-white/12 bg-base/95 p-6 shadow-2xl shadow-black/35 sm:p-8'
				exit={{ opacity: 0, y: 12, scale: 0.98 }}
				initial={{ opacity: 0, y: 24, scale: 0.98 }}
			>
				<div className='space-y-4'>
					<div className='inline-flex items-center gap-2 rounded-full border border-primary-500/25 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300'>
						<span className='size-2 rounded-full bg-primary-400' />
						Start inside the canvas
					</div>

					<div className='space-y-2'>
						<h2 className='text-3xl font-semibold tracking-tight text-text-primary'>
							Learn Shiko by building one real map.
						</h2>
						<p className='max-w-xl text-sm leading-6 text-text-secondary sm:text-base'>
							You do not need a product tour. You need the first few moves:
							add a node, type a pattern, and learn where the core controls
							live.
						</p>
					</div>

					<div className='grid gap-3 sm:grid-cols-3'>
						<OnboardingValueCard
							title='Build on the canvas'
							description='Start with a node and grow the map from there instead of reading feature copy.'
						/>
						<OnboardingValueCard
							title='Type one structured line'
							description='Use patterns like #tag and ^tomorrow to turn a quick thought into a structured node.'
						/>
						<OnboardingValueCard
							title='Share when ready'
							description='Learn the few controls that matter before any upgrade prompt gets in the way.'
						/>
					</div>

					<div className='flex flex-col gap-3 pt-2 sm:flex-row'>
						<Button
							className='gap-2'
							onClick={onStart}
							size='md'
							variant='default'
						>
							<Play className='size-4' />
							Start walkthrough
						</Button>
						<Button onClick={onExplore} size='md' variant='secondary'>
							Explore on my own
						</Button>
					</div>
				</div>
			</motion.div>
		</motion.div>
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
		<div className='rounded-2xl border border-white/10 bg-white/4 p-4'>
			<h3 className='text-sm font-semibold text-text-primary'>{title}</h3>
			<p className='mt-2 text-xs leading-5 text-text-secondary'>{description}</p>
		</div>
	);
}

function ChecklistCard({
	completedCount,
	onMinimize,
	onTaskAction,
	tasks,
}: {
	completedCount: number;
	onMinimize: () => void;
	onTaskAction: (taskId: OnboardingTaskId) => void;
	tasks: Record<OnboardingTaskId, boolean>;
}) {
	return (
		<motion.div
			animate={{ opacity: 1, x: 0 }}
			className='fixed right-4 top-24 z-[60] w-[min(360px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-base/96 p-4 shadow-2xl shadow-black/35 backdrop-blur-md'
			exit={{ opacity: 0, x: 24 }}
			initial={{ opacity: 0, x: 24 }}
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
					description='Open the editor by adding your first node.'
					label='Create a node'
					onClick={() => onTaskAction('create-node')}
				/>
				<ChecklistItem
					completed={tasks['try-pattern']}
					description='Use one structured line to create a richer node.'
					label='Try a pattern'
					onClick={() => onTaskAction('try-pattern')}
				/>
				<ChecklistItem
					completed={tasks['know-controls']}
					description='See the few controls that matter day to day.'
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
	description,
	isMobile,
	onDismiss,
	targetRect,
	title,
}: {
	description: string;
	isMobile: boolean;
	onDismiss: () => void;
	targetRect: FloatingTargetRect | null;
	title: string;
}) {
	const floatingStyle = useMemo(() => {
		if (isMobile || !targetRect || typeof window === 'undefined') {
			return null;
		}

		const cardWidth = Math.min(320, window.innerWidth - 32);
		const gap = 16;
		const prefersRight =
			targetRect.left + targetRect.width + gap + cardWidth < window.innerWidth - 16;
		const left = prefersRight
			? targetRect.left + targetRect.width + gap
			: Math.max(16, targetRect.left - cardWidth - gap);
		const top = Math.max(
			96,
			Math.min(targetRect.top + targetRect.height / 2 - 90, window.innerHeight - 220)
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
			className='fixed inset-x-4 bottom-4 z-[58] rounded-2xl border border-primary-500/25 bg-base/95 p-4 shadow-xl shadow-black/35 backdrop-blur-md'
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
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

function CoachmarkCard({
	currentStep,
	isLastStep,
	isMobile,
	onMinimize,
	onNext,
	targetRect,
}: {
	currentStep: (typeof ONBOARDING_COACHMARKS)[number];
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

		const cardWidth = Math.min(340, window.innerWidth - 32);
		const gap = 16;
		const left = Math.max(
			16,
			Math.min(
				targetRect.left + targetRect.width / 2 - cardWidth / 2,
				window.innerWidth - cardWidth - 16
			)
		);
		const top = Math.max(
			96,
			Math.min(targetRect.top + targetRect.height + gap, window.innerHeight - 250)
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
			className='fixed inset-x-4 bottom-4 z-[60]'
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
		>
			{content}
		</motion.div>
	);
}

function UpsellCard({
	onKeepUsingFree,
	onSeePlans,
}: {
	onKeepUsingFree: () => void;
	onSeePlans: () => void;
}) {
	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className='fixed right-4 top-24 z-[60] w-[min(380px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-base/96 p-5 shadow-2xl shadow-black/35 backdrop-blur-md'
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
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
	onResume,
}: {
	completedCount: number;
	onResume: () => void;
}) {
	return (
		<motion.button
			animate={{ opacity: 1, y: 0 }}
			className='fixed bottom-6 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-base/95 px-4 py-3 text-sm text-text-primary shadow-xl shadow-black/30 backdrop-blur-md'
			initial={{ opacity: 0, y: 10 }}
			onClick={onResume}
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
		hasCompletedOnboarding,
		startOnboarding,
		exploreOnboardingIndependently,
		resumeOnboarding,
		minimizeOnboarding,
		startOnboardingTask,
		advanceOnboardingCoachmark,
		completeOnboarding,
		openNodeEditor,
		reactFlowInstance,
		setPopoverOpen,
	} = useAppStore(
		useShallow((state) => ({
			onboardingStatus: state.onboardingStatus,
			onboardingTasks: state.onboardingTasks,
			onboardingActiveTarget: state.onboardingActiveTarget,
			onboardingCoachmarkStep: state.onboardingCoachmarkStep,
			onboardingIsMinimized: state.onboardingIsMinimized,
			hasCompletedOnboarding: state.hasCompletedOnboarding,
			startOnboarding: state.startOnboarding,
			exploreOnboardingIndependently: state.exploreOnboardingIndependently,
			resumeOnboarding: state.resumeOnboarding,
			minimizeOnboarding: state.minimizeOnboarding,
			startOnboardingTask: state.startOnboardingTask,
			advanceOnboardingCoachmark: state.advanceOnboardingCoachmark,
			completeOnboarding: state.completeOnboarding,
			openNodeEditor: state.openNodeEditor,
			reactFlowInstance: state.reactFlowInstance,
			setPopoverOpen: state.setPopoverOpen,
		}))
	);

	const completedCount = useMemo(
		() => Object.values(onboardingTasks).filter(Boolean).length,
		[onboardingTasks]
	);
	const shouldRenderMinimizedPill =
		onboardingIsMinimized && !hasCompletedOnboarding;
	const shouldRenderChecklist = onboardingStatus === 'checklist';
	const shouldRenderUpsell = onboardingStatus === 'upsell';
	const shouldRenderIntro = onboardingStatus === 'intro';
	const currentCoachmark = ONBOARDING_COACHMARKS[onboardingCoachmarkStep] ?? null;

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
			const target = document.querySelector<HTMLElement>(
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
	}, [onboardingActiveTarget, onboardingStatus]);

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
			(onboardingStatus === 'checklist' &&
				onboardingActiveTarget === 'add-node'));

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
						onExplore={exploreOnboardingIndependently}
						onStart={startOnboarding}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderChecklist && (
					<ChecklistCard
						completedCount={completedCount}
						onMinimize={minimizeOnboarding}
						onTaskAction={handleTaskAction}
						tasks={onboardingTasks}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderChecklist && onboardingActiveTarget === 'add-node' && (
					<FloatingHint
						description='Start here. Add one node and the walkthrough will move with you.'
						isMobile={isMobile}
						onDismiss={minimizeOnboarding}
						targetRect={targetRect}
						title='Create your first node'
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{onboardingStatus === 'coachmarks' && currentCoachmark && (
					<CoachmarkCard
						currentStep={currentCoachmark}
						isLastStep={
							onboardingCoachmarkStep === ONBOARDING_COACHMARKS.length - 1
						}
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
						onKeepUsingFree={completeOnboarding}
						onSeePlans={handleOpenUpgrade}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{shouldRenderMinimizedPill && (
					<MinimizedPill
						completedCount={completedCount}
						onResume={resumeOnboarding}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
