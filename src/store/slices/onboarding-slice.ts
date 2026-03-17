import {
	DEFAULT_ONBOARDING_TASKS,
	ONBOARDING_COACHMARKS,
	ONBOARDING_STATUSES,
	ONBOARDING_STORAGE_KEY,
	ONBOARDING_TASK_IDS,
	type OnboardingStatus,
	type OnboardingTarget,
	type OnboardingTaskId,
} from '@/constants/onboarding';
import { StateCreator } from 'zustand';
import { AppState } from '../app-state';

type OnboardingTaskState = Record<OnboardingTaskId, boolean>;

interface StoredOnboardingState {
	onboardingStatus?: OnboardingStatus;
	onboardingTasks?: Partial<Record<OnboardingTaskId, boolean>>;
	onboardingActiveTarget?: OnboardingTarget | null;
	onboardingCoachmarkStep?: number;
	onboardingIsMinimized?: boolean;
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
	handleOnboardingNodeEditorOpened: (mode: 'create' | 'edit') => void;
	handleOnboardingNodeCreated: (details: {
		mode: 'create' | 'edit';
		usedPatterns: boolean;
	}) => void;
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
	hasCompletedOnboarding: false,
	hasSkippedOnboarding: false,
	hasSeenOnboardingUpsell: false,
};

const hasWindow = () => typeof window !== 'undefined';

const isValidStatus = (value: unknown): value is OnboardingStatus =>
	typeof value === 'string' &&
	ONBOARDING_STATUSES.includes(value as OnboardingStatus);

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
			onboardingActiveTarget:
				parsed.onboardingActiveTarget && parsed.onboardingActiveTarget.length > 0
					? parsed.onboardingActiveTarget
					: null,
			onboardingCoachmarkStep:
				typeof parsed.onboardingCoachmarkStep === 'number'
					? parsed.onboardingCoachmarkStep
					: 0,
			onboardingIsMinimized: parsed.onboardingIsMinimized === true,
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

const getCreateNodeTarget = (tasks: OnboardingTaskState) =>
	tasks['create-node'] ? null : 'add-node';

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

	return !(
		currentSubscription?.plan?.name === 'pro' &&
		(currentSubscription.status === 'active' ||
			currentSubscription.status === 'trialing')
	);
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

	return {
		onboardingStatus: initialState.onboardingStatus ?? 'hidden',
		onboardingTasks: normalizeTasks(initialState.onboardingTasks),
		onboardingActiveTarget: initialState.onboardingActiveTarget ?? null,
		onboardingCoachmarkStep: initialState.onboardingCoachmarkStep ?? 0,
		onboardingIsMinimized: initialState.onboardingIsMinimized === true,
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
					? 'upsell'
					: 'intro',
			});
		},

		startOnboarding: () => {
			applyOnboardingPatch({
				onboardingStatus: 'checklist',
				onboardingActiveTarget: 'add-node',
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
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
			const { onboardingTasks, hasCompletedOnboarding } = get();

			if (hasCompletedOnboarding) {
				return;
			}

			applyOnboardingPatch({
				onboardingStatus: areAllTasksComplete(onboardingTasks)
					? 'upsell'
					: 'checklist',
				onboardingActiveTarget: getCreateNodeTarget(onboardingTasks),
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
				});
				return;
			}

			applyOnboardingPatch({
				onboardingStatus: 'checklist',
				onboardingActiveTarget: taskId === 'create-node' ? 'add-node' : null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
			});
		},

		markOnboardingTaskComplete: (taskId) => {
			const { onboardingTasks, hasSeenOnboardingUpsell } = get();
			if (onboardingTasks[taskId]) {
				return;
			}

			const nextTasks = {
				...onboardingTasks,
				[taskId]: true,
			};

			if (areAllTasksComplete(nextTasks)) {
				applyOnboardingPatch({
					onboardingTasks: nextTasks,
					onboardingStatus: hasSeenOnboardingUpsell ? 'hidden' : 'upsell',
					onboardingActiveTarget: null,
					onboardingCoachmarkStep: 0,
					onboardingIsMinimized: false,
					hasCompletedOnboarding: hasSeenOnboardingUpsell,
					hasSeenOnboardingUpsell: true,
				});
				return;
			}

			applyOnboardingPatch({
				onboardingTasks: nextTasks,
				onboardingStatus: 'checklist',
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
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

		handleOnboardingNodeEditorOpened: (mode) => {
			if (mode !== 'create') {
				return;
			}

			const { onboardingTasks } = get();
			if (!onboardingTasks['create-node']) {
				get().markOnboardingTaskComplete('create-node');
			}
		},

		handleOnboardingNodeCreated: ({ mode, usedPatterns }) => {
			if (mode !== 'create' || !usedPatterns) {
				return;
			}

			const { onboardingTasks } = get();
			if (!onboardingTasks['try-pattern']) {
				get().markOnboardingTaskComplete('try-pattern');
			}
		},

		restartOnboarding: () => {
			applyOnboardingPatch({
				onboardingStatus: 'intro',
				onboardingTasks: { ...DEFAULT_ONBOARDING_TASKS },
				onboardingActiveTarget: null,
				onboardingCoachmarkStep: 0,
				onboardingIsMinimized: false,
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
				hasCompletedOnboarding: false,
				hasSkippedOnboarding: false,
				hasSeenOnboardingUpsell: false,
			});
		},
	};
};
