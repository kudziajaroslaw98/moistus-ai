'use client';

import {
	ONBOARDING_PATTERN_EXAMPLE,
	getOnboardingCoachmarks,
	type OnboardingTaskId,
} from '@/constants/onboarding';
import { useIsMobile } from '@/hooks/use-mobile';
import useAppStore from '@/store/mind-map-store';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { CanvasPlacementHint } from './canvas-placement-hint';
import { CoachmarkCard } from './coachmark-card';
import { FloatingHint, type FloatingTargetRect } from './floating-hint';
import { IntroOverlay } from './intro-overlay';
import { UpsellCard } from './upsell-card';
import { WalkthroughSurface } from './walkthrough-surface';

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
	const walkthroughSurfaceMode = shouldRenderChecklistCard
		? 'checklist'
		: shouldRenderMinimizedPill
			? 'pill'
			: null;

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
	}, [onboardingActiveTarget, onboardingHighlightedNodeId, onboardingStatus]);

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

			<AnimatePresence initial={false} mode='popLayout'>
				{walkthroughSurfaceMode && (
					<WalkthroughSurface
						completedCount={completedCount}
						isMobile={isMobile}
						mode={walkthroughSurfaceMode}
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
		</>
	);
}
