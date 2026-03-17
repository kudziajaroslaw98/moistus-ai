import {
	DEFAULT_ONBOARDING_TASKS,
	ONBOARDING_COACHMARKS,
	ONBOARDING_CREATE_NODE_STEPS,
	ONBOARDING_PATTERN_STEPS,
	ONBOARDING_STATUSES,
	ONBOARDING_STORAGE_KEY,
	ONBOARDING_TARGETS,
	ONBOARDING_TASK_IDS,
	type OnboardingCreateNodeStep,
	type OnboardingPatternStep,
	type OnboardingStatus,
	type OnboardingTarget,
	type OnboardingTaskId,
} from '@/constants/onboarding';
import type { Tool } from '@/types/tool';
import { StateCreator } from 'zustand';
import { AppState } from '../app-state';

type OnboardingTaskState = Record<OnboardingTaskId, boolean>;

interface StoredOnboardingState {
	onboardingStatus?: OnboardingStatus;
	onboardingTasks?: Partial<Record<OnboardingTaskId, boolean>>;
	onboardingActiveTarget?: OnboardingTarget | null;
	onboardingCoachmarkStep?: number;
	onboardingIsMinimized?: boolean;
	onboardingCreateNodeStep?: OnboardingCreateNodeStep | null;
	onboardingPatternStep?: OnboardingPatternStep | null;
	onboardingHighlightedNodeId?: string | null;
	hasCompletedOnboarding?: boolean;
	hasSkippedOnboarding?: boolean;
	hasSeenOnboardingUpsell?: boolean;
}

export interface OnboardingSlice {
	onboardingStatus: OnboardingStatus;
	onboardingTasks: OnboardingTaskState;
	onboardingActiveTarget: OnboardingTarget | null;
	onboardingCoachmarkStep: number;
	onboardingIsMinimized: boolean;
	onboardingCreateNodeStep: OnboardingCreateNodeStep | null;
	onboardingPatternStep: OnboardingPatternStep | null;
	onboardingHighlightedNodeId: string | null;
	hasCompletedOnboarding: boolean;
	hasSkippedOnboarding: boolean;
	hasSeenOnboardingUpsell: boolean;

	maybeStartOnboarding: () => void;
	startOnboarding: () => void;
	exploreOnboardingIndependently: () => void;
	resumeOnboarding: () => void;
	minimizeOnboarding: () => void;
	startOnboardingTask: (taskId: OnboardingTaskId) => void;
	markOnboardingTaskComplete: (taskId: OnboardingTaskId) => void;
	advanceOnboardingCoachmark: () => void;
	handleOnboardingToolModeChanged: (tool: Tool) => void;
	handleOnboardingCanvasNodeCreated: () => void;
	handleOnboardingNodeEditorOpened: (mode: 'create' | 'edit') => void;
	handleOnboardingNodeCreated: (details: {
		mode: 'create' | 'edit';
		usedPatterns: boolean;
		nodeId?: string | null;
	}) => void;
	dismissOnboardingPatternEditHint: () => void;
	restartOnboarding: () => void;
	completeOnboarding: () => void;
	resetOnboarding: () => void;
}

interface OnboardingEligibilityInput {
	currentUser: { id: string; is_anonymous?: boolean } | null;
	mindMap: { user_id: string } | null;
	usageData: { mindMapsCount: number } | null;
	mapAccessError: { type: string } | null;
	hasCompletedOnboarding: boolean;
	hasSkippedOnboarding: boolean;
	currentSubscription: {
		status: string;
		plan?: { name?: string | null } | null;
	} | null;
}

const DEFAULT_STATE: StoredOnboardingState = {
	onboardingStatus: 'hidden',
	onboardingTasks: DEFAULT_ONBOARDING_TASKS,
	onboardingActiveTarget: null,
	onboardingCoachmarkStep: 0,
	onboardingIsMinimized: false,
	onboardingCreateNodeStep: null,
	onboardingPatternStep: null,
	onboardingHighlightedNodeId: null,
	hasCompletedOnboarding: false,
	hasSkippedOnboarding: false,
	hasSeenOnboardingUpsell: false,
};

const hasWindow = () => typeof window !== 'undefined';

const isValidStatus = (value: unknown): value is OnboardingStatus =>
	typeof value === 'string' &&
	ONBOARDING_STATUSES.includes(value as OnboardingStatus);

const isValidTarget = (value: unknown): value is OnboardingTarget =>
	typeof value === 'string' &&
	ONBOARDING_TARGETS.includes(value as OnboardingTarget);

const isValidCreateNodeStep = (
	value: unknown
): value is OnboardingCreateNodeStep =>
	typeof value === 'string' &&
	ONBOARDING_CREATE_NODE_STEPS.includes(value as OnboardingCreateNodeStep);

const isValidPatternStep = (value: unknown): value is OnboardingPatternStep =>
	typeof value === 'string' &&
	ONBOARDING_PATTERN_STEPS.includes(value as OnboardingPatternStep);

const normalizeTasks = (
	value: Partial<Record<OnboardingTaskId, boolean>> | undefined
): OnboardingTaskState => ({
	'create-node': value?.['create-node'] === true,
	'try-pattern': value?.['try-pattern'] === true,
	'know-controls': value?.['know-controls'] === true,
});

const getDefaultState = (): StoredOnboardingState => ({
	...DEFAULT_STATE,
	onboardingTasks: { ...DEFAULT_ONBOARDING_TASKS },
});

const readStoredOnboardingState = (): StoredOnboardingState => {
	if (!hasWindow()) {
		return getDefaultState();
	}

	const storedValue = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
	if (!storedValue) {
		return getDefaultState();
	}

	try {
		const parsed = JSON.parse(storedValue) as StoredOnboardingState;
		return {
			onboardingStatus: isValidStatus(parsed.onboardingStatus)
				? parsed.onboardingStatus
				: 'hidden',
			onboardingTasks: normalizeTasks(parsed.onboardingTasks),
			onboardingActiveTarget: isValidTarget(parsed.onboardingActiveTarget)
				? parsed.onboardingActiveTarget
				: null,
			onboardingCoachmarkStep:
				typeof parsed.onboardingCoachmarkStep === 'number'
					? parsed.onboardingCoachmarkStep
					: 0,
			onboardingIsMinimized: parsed.onboardingIsMinimized === true,
			onboardingCreateNodeStep: isValidCreateNodeStep(
				parsed.onboardingCreateNodeStep
			)
				? parsed.onboardingCreateNodeStep
				: null,
			onboardingPatternStep: isValidPatternStep(parsed.onboardingPatternStep)
				? parsed.onboardingPatternStep
				: null,
			onboardingHighlightedNodeId:
				typeof parsed.onboardingHighlightedNodeId === 'string' &&
				parsed.onboardingHighlightedNodeId.length > 0
					? parsed.onboardingHighlightedNodeId
					: null,
			hasCompletedOnboarding: parsed.hasCompletedOnboarding === true,
			hasSkippedOnboarding: parsed.hasSkippedOnboarding === true,
			hasSeenOnboardingUpsell: parsed.hasSeenOnboardingUpsell === true,
		};
	} catch (error) {
		console.error('Error parsing onboarding data:', error);
		return getDefaultState();
	}
};

const areAllTasksComplete = (tasks: OnboardingTaskState) =>
	ONBOARDING_TASK_IDS.every((taskId) => tasks[taskId]);

const isProSubscription = (
	currentSubscription: OnboardingEligibilityInput['currentSubscription']
) =>
	currentSubscription?.plan?.name === 'pro' &&
	['active', 'trialing'].includes(currentSubscription.status);

const shouldShowOnboardingUpsell = (
	currentSubscription: OnboardingEligibilityInput['currentSubscription']
) => !isProSubscription(currentSubscription);

const getCreateNodeStepForTool = (
	activeTool: Tool
): OnboardingCreateNodeStep => (activeTool === 'node' ? 'canvas' : 'toolbar');

const getCreateNodeTarget = (
	tasks: OnboardingTaskState,
	createNodeStep: OnboardingCreateNodeStep | null
) => {
	if (tasks['create-node']) {
		return null;
	}

	return createNodeStep === 'canvas' ? null : 'add-node';
};

const getChecklistTarget = ({
	tasks,
	createNodeStep,
	patternStep,
	highlightedNodeId,
}: {
	tasks: OnboardingTaskState;
	createNodeStep: OnboardingCreateNodeStep | null;
	patternStep: OnboardingPatternStep | null;
	highlightedNodeId: string | null;
}) => {
	if (patternStep === 'post-create-edit-hint' && highlightedNodeId) {
		return 'created-node';
	}

	return getCreateNodeTarget(tasks, createNodeStep);
};

const persistOnboardingState = (state: OnboardingSlice) => {
	if (!hasWindow()) {
		return;
	}

	const payload: StoredOnboardingState = {
		onboardingStatus: state.onboardingStatus,
		onboardingTasks: state.onboardingTasks,
		onboardingActiveTarget: state.onboardingActiveTarget,
		onboardingCoachmarkStep: state.onboardingCoachmarkStep,
		onboardingIsMinimized: state.onboardingIsMinimized,
		onboardingCreateNodeStep: state.onboardingCreateNodeStep,
		onboardingPatternStep: state.onboardingPatternStep,
		onboardingHighlightedNodeId: state.onboardingHighlightedNodeId,
		hasCompletedOnboarding: state.hasCompletedOnboarding,
		hasSkippedOnboarding: state.hasSkippedOnboarding,
		hasSeenOnboardingUpsell: state.hasSeenOnboardingUpsell,
	};

	window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
};

export const isEligibleForOnboarding = ({
	currentUser,
	mindMap,
	usageData,
	mapAccessError,
	hasCompletedOnboarding,
	hasSkippedOnboarding,
	currentSubscription,
}: OnboardingEligibilityInput) => {
	if (mapAccessError?.type === 'access_denied') {
		return false;
	}

	if (hasCompletedOnboarding || hasSkippedOnboarding) {
		return false;
	}

	if (!currentUser || currentUser.is_anonymous) {
		return false;
	}

	if (!mindMap || mindMap.user_id !== currentUser.id) {
		return false;
	}

	if (!usageData || usageData.mindMapsCount !== 1) {
		return false;
	}

	if (currentSubscription?.status === 'trialing') {
		return false;
	}

	return !isProSubscription(currentSubscription);
};

export const createOnboardingSlice: StateCreator<
	AppState,
	[],
	[],
	OnboardingSlice
> = (set, get) => {
	const initialState = readStoredOnboardingState();

	const applyOnboardingPatch = (patch: Partial<OnboardingSlice>) => {
		set(patch);
		persistOnboardingState(get() as AppState & OnboardingSlice);
	};

	const getCompletionPatch = (
		nextTasks: OnboardingTaskState
	): Partial<OnboardingSlice> => {
		const { currentSubscription } = get();

		if (shouldShowOnboardingUpsell(currentSubscription)) {
			return {
				onboardingTasks: nextTasks,
				onboardingStatus: 'upsell',
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
				onboardingCreateNodeStep: null,
				onboardingPatternStep: null,
				onboardingHighlightedNodeId: null,
				hasCompletedOnboarding: false,
				hasSkippedOnboarding: false,
				hasSeenOnboardingUpsell: true,
			};
		}

		return {
			onboardingTasks: nextTasks,
			onboardingStatus: 'hidden',
			onboardingActiveTarget: null,
			onboardingCoachmarkStep: 0,
			onboardingIsMinimized: false,
			onboardingCreateNodeStep: null,
			onboardingPatternStep: null,
			onboardingHighlightedNodeId: null,
			hasCompletedOnboarding: true,
			hasSkippedOnboarding: false,
			hasSeenOnboardingUpsell: false,
		};
	};

	return {
		onboardingStatus: initialState.onboardingStatus ?? 'hidden',
		onboardingTasks: normalizeTasks(initialState.onboardingTasks),
		onboardingActiveTarget: initialState.onboardingActiveTarget ?? null,
		onboardingCoachmarkStep: initialState.onboardingCoachmarkStep ?? 0,
		onboardingIsMinimized: initialState.onboardingIsMinimized === true,
		onboardingCreateNodeStep: initialState.onboardingCreateNodeStep ?? null,
		onboardingPatternStep: initialState.onboardingPatternStep ?? null,
		onboardingHighlightedNodeId: initialState.onboardingHighlightedNodeId ?? null,
		hasCompletedOnboarding: initialState.hasCompletedOnboarding === true,
		hasSkippedOnboarding: initialState.hasSkippedOnboarding === true,
		hasSeenOnboardingUpsell: initialState.hasSeenOnboardingUpsell === true,

		maybeStartOnboarding: () => {
			const {
				currentUser,
				mindMap,
				usageData,
				mapAccessError,
				hasCompletedOnboarding,
				hasSkippedOnboarding,
				currentSubscription,
				onboardingStatus,
				onboardingTasks,
				onboardingIsMinimized,
			} = get();

			if (
				!isEligibleForOnboarding({
					currentUser,
					mindMap,
					usageData,
					mapAccessError,
					hasCompletedOnboarding,
					hasSkippedOnboarding,
					currentSubscription,
				})
			) {
				return;
			}

			if (onboardingStatus !== 'hidden' || onboardingIsMinimized) {
				return;
			}

			applyOnboardingPatch({
				onboardingStatus: areAllTasksComplete(onboardingTasks)
					? shouldShowOnboardingUpsell(currentSubscription)
						? 'upsell'
						: 'hidden'
					: 'intro',
			});
		},

		startOnboarding: () => {
			const createNodeStep = getCreateNodeStepForTool(get().activeTool);

			applyOnboardingPatch({
				onboardingStatus: 'checklist',
				onboardingActiveTarget: getCreateNodeTarget(
					get().onboardingTasks,
					createNodeStep
				),
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
				onboardingCreateNodeStep: createNodeStep,
				onboardingPatternStep: null,
				onboardingHighlightedNodeId: null,
				hasSkippedOnboarding: false,
			});
		},

		exploreOnboardingIndependently: () => {
			applyOnboardingPatch({
				onboardingStatus: 'hidden',
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: true,
				hasSkippedOnboarding: true,
			});
		},

		resumeOnboarding: () => {
			const {
				onboardingTasks,
				hasCompletedOnboarding,
				currentSubscription,
				onboardingCreateNodeStep,
				onboardingPatternStep,
				onboardingHighlightedNodeId,
			} = get();

			if (hasCompletedOnboarding) {
				return;
			}

			if (areAllTasksComplete(onboardingTasks)) {
				applyOnboardingPatch(
					shouldShowOnboardingUpsell(currentSubscription)
						? {
								onboardingStatus: 'upsell',
								onboardingActiveTarget: null,
								onboardingCoachmarkStep: 0,
								onboardingIsMinimized: false,
							}
						: getCompletionPatch(onboardingTasks)
				);
				return;
			}

			applyOnboardingPatch({
				onboardingStatus: 'checklist',
				onboardingActiveTarget: getChecklistTarget({
					tasks: onboardingTasks,
					createNodeStep: onboardingCreateNodeStep,
					patternStep: onboardingPatternStep,
					highlightedNodeId: onboardingHighlightedNodeId,
				}),
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
			});
		},

		minimizeOnboarding: () => {
			const { hasCompletedOnboarding } = get();
			if (hasCompletedOnboarding) {
				return;
			}

			applyOnboardingPatch({
				onboardingStatus: 'hidden',
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: true,
			});
		},

		startOnboardingTask: (taskId) => {
			if (taskId === 'know-controls') {
				applyOnboardingPatch({
					onboardingStatus: 'coachmarks',
					onboardingActiveTarget: ONBOARDING_COACHMARKS[0]?.target ?? null,
					onboardingCoachmarkStep: 0,
					onboardingIsMinimized: false,
					onboardingPatternStep: null,
					onboardingHighlightedNodeId: null,
				});
				return;
			}

			if (taskId === 'create-node') {
				const createNodeStep = getCreateNodeStepForTool(get().activeTool);

				applyOnboardingPatch({
					onboardingStatus: 'checklist',
					onboardingActiveTarget: getCreateNodeTarget(
						get().onboardingTasks,
						createNodeStep
					),
					onboardingCoachmarkStep: 0,
					onboardingIsMinimized: false,
					onboardingCreateNodeStep: createNodeStep,
					onboardingPatternStep: null,
					onboardingHighlightedNodeId: null,
				});
				return;
			}

			applyOnboardingPatch({
				onboardingStatus: 'checklist',
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
				onboardingPatternStep: 'pattern-editor',
				onboardingHighlightedNodeId: null,
			});
		},

		markOnboardingTaskComplete: (taskId) => {
			const {
				onboardingTasks,
				onboardingCreateNodeStep,
				onboardingPatternStep,
				onboardingHighlightedNodeId,
			} = get();
			if (onboardingTasks[taskId]) {
				return;
			}

			const nextTasks = {
				...onboardingTasks,
				[taskId]: true,
			};

			if (areAllTasksComplete(nextTasks)) {
				applyOnboardingPatch(getCompletionPatch(nextTasks));
				return;
			}

			applyOnboardingPatch({
				onboardingTasks: nextTasks,
				onboardingStatus: 'checklist',
				onboardingActiveTarget: getChecklistTarget({
					tasks: nextTasks,
					createNodeStep:
						taskId === 'create-node' ? null : onboardingCreateNodeStep,
					patternStep:
						taskId === 'try-pattern' ? null : onboardingPatternStep,
					highlightedNodeId:
						taskId === 'try-pattern' ? null : onboardingHighlightedNodeId,
				}),
				onboardingCoachmarkStep: 0,
				onboardingCreateNodeStep:
					taskId === 'create-node' ? null : onboardingCreateNodeStep,
				onboardingPatternStep:
					taskId === 'try-pattern' ? null : onboardingPatternStep,
				onboardingHighlightedNodeId:
					taskId === 'try-pattern' ? null : onboardingHighlightedNodeId,
			});
		},

		advanceOnboardingCoachmark: () => {
			const { onboardingStatus, onboardingCoachmarkStep } = get();
			if (onboardingStatus !== 'coachmarks') {
				return;
			}

			const nextStep = onboardingCoachmarkStep + 1;
			if (nextStep >= ONBOARDING_COACHMARKS.length) {
				get().markOnboardingTaskComplete('know-controls');
				return;
			}

			applyOnboardingPatch({
				onboardingCoachmarkStep: nextStep,
				onboardingActiveTarget: ONBOARDING_COACHMARKS[nextStep]?.target ?? null,
			});
		},

		handleOnboardingToolModeChanged: (tool) => {
			const {
				onboardingTasks,
				onboardingStatus,
				onboardingCreateNodeStep,
				onboardingIsMinimized,
			} = get();

			if (
				onboardingTasks['create-node'] ||
				(onboardingStatus === 'hidden' && !onboardingIsMinimized) ||
				onboardingStatus === 'coachmarks' ||
				onboardingStatus === 'intro' ||
				onboardingStatus === 'upsell'
			) {
				return;
			}

			const nextCreateNodeStep = getCreateNodeStepForTool(tool);
			if (nextCreateNodeStep === onboardingCreateNodeStep) {
				return;
			}

			applyOnboardingPatch({
				onboardingCreateNodeStep: nextCreateNodeStep,
				onboardingActiveTarget:
					onboardingStatus === 'checklist' && nextCreateNodeStep === 'toolbar'
						? 'add-node'
						: null,
			});
		},

		handleOnboardingCanvasNodeCreated: () => {
			const {
				onboardingTasks,
				onboardingPatternStep,
				onboardingHighlightedNodeId,
			} = get();
			if (onboardingTasks['create-node']) {
				return;
			}

			const nextTasks = {
				...onboardingTasks,
				'create-node': true,
			};

			if (areAllTasksComplete(nextTasks)) {
				applyOnboardingPatch(getCompletionPatch(nextTasks));
				return;
			}

			applyOnboardingPatch({
				onboardingTasks: nextTasks,
				onboardingStatus: 'checklist',
				onboardingActiveTarget: getChecklistTarget({
					tasks: nextTasks,
					createNodeStep: null,
					patternStep: onboardingPatternStep,
					highlightedNodeId: onboardingHighlightedNodeId,
				}),
				onboardingCoachmarkStep: 0,
				onboardingCreateNodeStep: null,
			});
		},

		handleOnboardingNodeEditorOpened: (mode) => {
			if (mode !== 'edit') {
				return;
			}

			const { onboardingPatternStep } = get();
			if (onboardingPatternStep === 'post-create-edit-hint') {
				get().dismissOnboardingPatternEditHint();
			}
		},

		handleOnboardingNodeCreated: ({ mode, usedPatterns, nodeId }) => {
			if (mode !== 'create' || !usedPatterns) {
				return;
			}

			const { onboardingTasks, onboardingCreateNodeStep } = get();
			if (onboardingTasks['try-pattern']) {
				return;
			}

			const nextTasks = {
				...onboardingTasks,
				'try-pattern': true,
			};

			if (!nodeId) {
				if (areAllTasksComplete(nextTasks)) {
					applyOnboardingPatch(getCompletionPatch(nextTasks));
					return;
				}

				applyOnboardingPatch({
					onboardingTasks: nextTasks,
					onboardingStatus: 'checklist',
					onboardingActiveTarget: getChecklistTarget({
						tasks: nextTasks,
						createNodeStep: onboardingCreateNodeStep,
						patternStep: null,
						highlightedNodeId: null,
					}),
					onboardingCoachmarkStep: 0,
					onboardingPatternStep: null,
					onboardingHighlightedNodeId: null,
				});
				return;
			}

			applyOnboardingPatch({
				onboardingTasks: nextTasks,
				onboardingStatus: 'checklist',
				onboardingActiveTarget: 'created-node',
				onboardingCoachmarkStep: 0,
				onboardingPatternStep: 'post-create-edit-hint',
				onboardingHighlightedNodeId: nodeId,
				onboardingIsMinimized: false,
			});
		},

		dismissOnboardingPatternEditHint: () => {
			const { onboardingTasks, onboardingCreateNodeStep } = get();

			if (areAllTasksComplete(onboardingTasks)) {
				applyOnboardingPatch(getCompletionPatch(onboardingTasks));
				return;
			}

			applyOnboardingPatch({
				onboardingStatus: 'checklist',
				onboardingActiveTarget: getChecklistTarget({
					tasks: onboardingTasks,
					createNodeStep: onboardingCreateNodeStep,
					patternStep: null,
					highlightedNodeId: null,
				}),
				onboardingCoachmarkStep: 0,
				onboardingPatternStep: null,
				onboardingHighlightedNodeId: null,
			});
		},

		restartOnboarding: () => {
			applyOnboardingPatch({
				onboardingStatus: 'intro',
				onboardingTasks: { ...DEFAULT_ONBOARDING_TASKS },
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
				onboardingCreateNodeStep: null,
				onboardingPatternStep: null,
				onboardingHighlightedNodeId: null,
				hasCompletedOnboarding: false,
				hasSkippedOnboarding: false,
				hasSeenOnboardingUpsell: false,
			});
		},

		completeOnboarding: () => {
			applyOnboardingPatch({
				onboardingStatus: 'hidden',
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
				onboardingCreateNodeStep: null,
				onboardingPatternStep: null,
				onboardingHighlightedNodeId: null,
				hasCompletedOnboarding: true,
				hasSkippedOnboarding: false,
				hasSeenOnboardingUpsell: true,
			});
		},

		resetOnboarding: () => {
			if (hasWindow()) {
				window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
			}

			set({
				onboardingStatus: 'hidden',
				onboardingTasks: { ...DEFAULT_ONBOARDING_TASKS },
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
				onboardingCreateNodeStep: null,
				onboardingPatternStep: null,
				onboardingHighlightedNodeId: null,
				hasCompletedOnboarding: false,
				hasSkippedOnboarding: false,
				hasSeenOnboardingUpsell: false,
			});
		},
	};
};
