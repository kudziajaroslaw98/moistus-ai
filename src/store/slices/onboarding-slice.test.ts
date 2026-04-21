import {
	ONBOARDING_COACHMARKS,
	ONBOARDING_MOBILE_COACHMARKS,
	ONBOARDING_STORAGE_KEY,
} from '@/constants/onboarding';

const getOnboardingStorageKey = (userId: string) =>
	`${ONBOARDING_STORAGE_KEY}:${userId}`;

function createOnboardingSliceHarness(
	overrides: Record<string, unknown> = {}
) {
	const { createOnboardingSlice } =
		require('@/store/slices/onboarding-slice') as typeof import('@/store/slices/onboarding-slice');

	let state: Record<string, unknown> = {
		currentUser: { id: 'user-1', is_anonymous: false },
		mindMap: { user_id: 'user-1' },
		usageData: { mindMapsCount: 1 },
		mapAccessError: null,
		hasResolvedSubscription: true,
		currentSubscription: null,
		...overrides,
	};

	const set = (partial: unknown) => {
		const patch =
			typeof partial === 'function'
				? (
						partial as (
							current: Record<string, unknown>
						) => Record<string, unknown>
					)(state)
				: (partial as Record<string, unknown>);

		state = { ...state, ...(patch ?? {}) };
	};

	const get = () => state;
	const slice = createOnboardingSlice(set as never, get as never, {} as never);
	state = { ...state, ...slice };

	return {
		getState: () => state,
		setState: (patch: Record<string, unknown>) => {
			state = { ...state, ...patch };
		},
	};
}

describe('onboarding slice', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('starts the intro for the first owned free map', () => {
		const harness = createOnboardingSliceHarness();

		(harness.getState().maybeStartOnboarding as () => void)();

		expect(harness.getState().onboardingStatus).toBe('intro');
		expect(harness.getState().onboardingIsMinimized).toBe(false);
	});

	it('does not auto-start for collaborators or pro users', () => {
		const collaboratorHarness = createOnboardingSliceHarness({
			mindMap: { user_id: 'owner-2' },
		});

		(collaboratorHarness.getState().maybeStartOnboarding as () => void)();
		expect(collaboratorHarness.getState().onboardingStatus).toBe('hidden');

		const proHarness = createOnboardingSliceHarness({
			currentSubscription: {
				status: 'active',
				plan: { name: 'pro' },
			},
		});

		(proHarness.getState().maybeStartOnboarding as () => void)();
		expect(proHarness.getState().onboardingStatus).toBe('hidden');
	});

	it('waits for subscription resolution before starting onboarding', () => {
		const harness = createOnboardingSliceHarness({
			hasResolvedSubscription: false,
		});

		(harness.getState().maybeStartOnboarding as () => void)();

		expect(harness.getState().onboardingStatus).toBe('hidden');
	});

	it('can skip the walkthrough entirely without leaving the pill behind', () => {
		const harness = createOnboardingSliceHarness();

		(harness.getState().startOnboarding as () => void)();
		(harness.getState().skipOnboarding as () => void)();

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: false,
			hasSkippedOnboarding: true,
			hasCompletedOnboarding: false,
		});
		expect(
			JSON.parse(
				window.localStorage.getItem(getOnboardingStorageKey('user-1')) || '{}'
			)
		).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: false,
			hasSkippedOnboarding: true,
		});
	});

	it('does not reopen skipped hidden onboarding when create-node events race hydration', () => {
		window.localStorage.setItem(
			getOnboardingStorageKey('user-1'),
			JSON.stringify({
				onboardingStatus: 'hidden',
				onboardingTasks: {
					'create-node': false,
					'try-pattern': false,
					'know-controls': false,
				},
				onboardingIsMinimized: false,
				hasSkippedOnboarding: true,
			})
		);

		const harness = createOnboardingSliceHarness({
			currentUser: null,
			mindMap: null,
			usageData: null,
		});

		harness.setState({
			currentUser: { id: 'user-1', is_anonymous: false },
			mindMap: { user_id: 'user-1' },
			usageData: { mindMapsCount: 1 },
		});
		(harness.getState().handleOnboardingCanvasNodeCreated as () => void)();

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: false,
			hasSkippedOnboarding: true,
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': false,
			},
		});
	});

	it('rehydrates onboarding state after the current user becomes available', () => {
		window.localStorage.setItem(
			getOnboardingStorageKey('user-1'),
			JSON.stringify({
				onboardingStatus: 'checklist',
				onboardingTasks: {
					'create-node': true,
					'try-pattern': false,
					'know-controls': false,
				},
				onboardingIsMinimized: true,
			})
		);

		const harness = createOnboardingSliceHarness({
			currentUser: null,
			mindMap: null,
			usageData: null,
		});

		harness.setState({
			currentUser: { id: 'user-1', is_anonymous: false },
			mindMap: { user_id: 'user-1' },
			usageData: { mindMapsCount: 1 },
		});
		(harness.getState().maybeStartOnboarding as () => void)();

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingIsMinimized: true,
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
		});
	});

	it('keeps onboarding state isolated per user', () => {
		window.localStorage.setItem(
			getOnboardingStorageKey('user-1'),
			JSON.stringify({
				onboardingStatus: 'checklist',
				onboardingTasks: {
					'create-node': true,
					'try-pattern': false,
					'know-controls': false,
				},
				onboardingIsMinimized: true,
			})
		);

		const otherUserHarness = createOnboardingSliceHarness({
			currentUser: { id: 'user-2', is_anonymous: false },
			mindMap: { user_id: 'user-2' },
		});

		expect(otherUserHarness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: false,
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': false,
			},
		});
	});

	it('moves create-node guidance from toolbar to canvas before completion', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.startOnboarding as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingCreateNodeStep: 'toolbar',
			onboardingActiveTarget: 'add-node',
		});

		(state.handleOnboardingToolModeChanged as (tool: string) => void)('node');
		expect(harness.getState()).toMatchObject({
			onboardingCreateNodeStep: 'canvas',
			onboardingActiveTarget: null,
		});

		(state.handleOnboardingCanvasNodeCreated as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			onboardingCreateNodeStep: null,
		});
	});

	it('shows a post-create edit hint after the pattern task succeeds', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.startOnboardingTask as (taskId: string) => void)('try-pattern');
		(
			state.handleOnboardingNodeCreated as (details: {
				mode: 'create' | 'edit';
				usedPatterns: boolean;
				nodeId?: string | null;
			}) => void
		)({
			mode: 'create',
			usedPatterns: true,
			nodeId: 'node-123',
		});

		expect(harness.getState()).toMatchObject({
			onboardingTasks: {
				'create-node': true,
				'try-pattern': true,
				'know-controls': false,
			},
			onboardingCreateNodeStep: null,
			onboardingPatternStep: 'post-create-edit-hint',
			onboardingHighlightedNodeId: 'node-123',
			onboardingActiveTarget: 'created-node',
		});
	});

	it('keeps the post-create edit hint anchored when the tool mode changes', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		harness.setState({
			onboardingStatus: 'checklist',
			onboardingTasks: {
				'create-node': false,
				'try-pattern': true,
				'know-controls': false,
			},
			onboardingCreateNodeStep: 'toolbar',
			onboardingPatternStep: 'post-create-edit-hint',
			onboardingHighlightedNodeId: 'node-123',
			onboardingActiveTarget: 'created-node',
		});

		(state.handleOnboardingToolModeChanged as (tool: string) => void)('node');

		expect(harness.getState()).toMatchObject({
			onboardingCreateNodeStep: 'canvas',
			onboardingPatternStep: 'post-create-edit-hint',
			onboardingHighlightedNodeId: 'node-123',
			onboardingActiveTarget: 'created-node',
		});
	});

	it('dismisses the edit hint and finishes without upsell for pro users', () => {
		const harness = createOnboardingSliceHarness({
			currentSubscription: {
				status: 'active',
				plan: { name: 'pro' },
			},
		});
		const state = harness.getState();

		(state.markOnboardingTaskComplete as (taskId: string) => void)('create-node');
		(
			state.handleOnboardingNodeCreated as (details: {
				mode: 'create' | 'edit';
				usedPatterns: boolean;
				nodeId?: string | null;
			}) => void
		)({
			mode: 'create',
			usedPatterns: true,
			nodeId: 'node-123',
		});
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');

		for (let index = 0; index < ONBOARDING_COACHMARKS.length; index += 1) {
			(state.advanceOnboardingCoachmark as () => void)();
		}

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			hasCompletedOnboarding: true,
			hasSeenOnboardingUpsell: false,
			onboardingPatternStep: null,
			onboardingHighlightedNodeId: null,
			onboardingTasks: {
				'create-node': true,
				'try-pattern': true,
				'know-controls': true,
			},
		});
	});

	it('uses the mobile controls sequence when the viewport is mobile', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.setOnboardingViewport as (viewport: 'desktop' | 'mobile') => void)(
			'mobile'
		);
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'coachmarks',
			onboardingViewport: 'mobile',
			onboardingActiveTarget: ONBOARDING_MOBILE_COACHMARKS[0]?.target,
		});

		for (
			let index = 0;
			index < ONBOARDING_MOBILE_COACHMARKS.length - 1;
			index += 1
		) {
			(state.advanceOnboardingCoachmark as () => void)();
		}

		expect(harness.getState().onboardingCoachmarkStep).toBe(
			ONBOARDING_MOBILE_COACHMARKS.length - 1
		);
		expect(harness.getState().onboardingActiveTarget).toBe(
			ONBOARDING_MOBILE_COACHMARKS[ONBOARDING_MOBILE_COACHMARKS.length - 1]
				?.target
		);
	});

	it('points the mobile controls tour at the mobile menu instead of the share button', () => {
		expect(
			ONBOARDING_MOBILE_COACHMARKS.some(
				(coachmark) => coachmark.target === 'mobile-menu'
			)
		).toBe(true);
		expect(
			ONBOARDING_MOBILE_COACHMARKS.some(
				(coachmark) => coachmark.target === 'share'
			)
		).toBe(false);
	});

	it('includes history in the desktop controls tour', () => {
		const shortcutsIndex = ONBOARDING_COACHMARKS.findIndex(
			(coachmark) => coachmark.target === 'shortcuts-help'
		);
		const breadcrumbIndex = ONBOARDING_COACHMARKS.findIndex(
			(coachmark) => coachmark.target === 'breadcrumb-home'
		);
		const historyIndex = ONBOARDING_COACHMARKS.findIndex(
			(coachmark) => coachmark.target === 'history'
		);
		const shareIndex = ONBOARDING_COACHMARKS.findIndex(
			(coachmark) => coachmark.target === 'share'
		);

		expect(historyIndex).toBeGreaterThanOrEqual(0);
		expect(shortcutsIndex).toBeLessThan(breadcrumbIndex);
		expect(breadcrumbIndex).toBeLessThan(historyIndex);
		expect(historyIndex).toBeLessThan(shareIndex);
	});

	it('closes a reopened completed controls tour back into the checklist', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.markOnboardingTaskComplete as (taskId: string) => void)('know-controls');
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');

		for (let index = 0; index < ONBOARDING_COACHMARKS.length; index += 1) {
			(state.advanceOnboardingCoachmark as () => void)();
		}

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingCoachmarkStep: 0,
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': true,
			},
		});
	});

	it('resumes controls tour from the paused coachmark step', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.startOnboardingTask as (taskId: string) => void)('know-controls');
		(state.advanceOnboardingCoachmark as () => void)();
		(state.advanceOnboardingCoachmark as () => void)();

		const pausedStep = harness.getState().onboardingCoachmarkStep;
		const pausedTarget = harness.getState().onboardingActiveTarget;

		(state.minimizeOnboarding as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			onboardingCoachmarkStep: pausedStep,
			onboardingActiveTarget: pausedTarget,
		});

		(state.resumeOnboarding as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingIsMinimized: false,
			onboardingCoachmarkStep: pausedStep,
			onboardingActiveTarget: 'add-node',
		});
	});

	it('rehydrates paused controls tour state and resumes with clamped mobile step after refresh', () => {
		window.localStorage.setItem(
			getOnboardingStorageKey('user-1'),
			JSON.stringify({
				onboardingStatus: 'hidden',
				onboardingTasks: {
					'create-node': false,
					'try-pattern': false,
					'know-controls': false,
				},
				onboardingIsMinimized: true,
				onboardingCoachmarkStep: 999,
				onboardingActiveTarget: 'share',
				onboardingViewport: 'mobile',
			})
		);

		const harness = createOnboardingSliceHarness({
			currentUser: null,
			mindMap: null,
			usageData: null,
		});

		harness.setState({
			currentUser: { id: 'user-1', is_anonymous: false },
			mindMap: { user_id: 'user-1' },
			usageData: { mindMapsCount: 1 },
		});
		(harness.getState().resumeOnboarding as () => void)();

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingIsMinimized: false,
			onboardingPausedCoachmarkStep: ONBOARDING_MOBILE_COACHMARKS.length - 1,
			onboardingActiveTarget: 'add-node',
		});
	});

	it('resumes paused mobile controls tour from Start action without resetting step', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.setOnboardingViewport as (viewport: 'desktop' | 'mobile') => void)(
			'mobile'
		);
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');
		(state.advanceOnboardingCoachmark as () => void)();
		(state.advanceOnboardingCoachmark as () => void)();

		const pausedStep = harness.getState().onboardingCoachmarkStep;
		const pausedTarget = harness.getState().onboardingActiveTarget;

		(state.minimizeOnboarding as () => void)();
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'coachmarks',
			onboardingIsMinimized: false,
			onboardingViewport: 'mobile',
			onboardingCoachmarkStep: pausedStep,
			onboardingActiveTarget: pausedTarget,
		});
	});

	it('keeps paused controls-tour progress after expanding checklist and minimizing again', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.startOnboardingTask as (taskId: string) => void)('know-controls');
		(state.advanceOnboardingCoachmark as () => void)();
		(state.advanceOnboardingCoachmark as () => void)();
		const pausedTarget = harness.getState().onboardingActiveTarget;
		const pausedStep = harness.getState().onboardingCoachmarkStep;

		(state.minimizeOnboarding as () => void)();
		(state.resumeOnboarding as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingPausedCoachmarkStep: pausedStep,
		});

		(state.minimizeOnboarding as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			onboardingPausedCoachmarkStep: pausedStep,
		});

		(state.startOnboardingTask as (taskId: string) => void)('know-controls');
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'coachmarks',
			onboardingIsMinimized: false,
			onboardingCoachmarkStep: pausedStep,
			onboardingActiveTarget: pausedTarget,
		});
	});

	it('preserves paused controls-tour step after checklist task updates reset active coachmark step', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.startOnboardingTask as (taskId: string) => void)('know-controls');
		(state.advanceOnboardingCoachmark as () => void)();
		(state.advanceOnboardingCoachmark as () => void)();
		const pausedTarget = harness.getState().onboardingActiveTarget;
		const pausedStep = harness.getState().onboardingCoachmarkStep;

		(state.minimizeOnboarding as () => void)();
		(state.resumeOnboarding as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingPausedCoachmarkStep: pausedStep,
		});

		(state.handleOnboardingCanvasNodeCreated as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
			onboardingCoachmarkStep: 0,
			onboardingPausedCoachmarkStep: pausedStep,
		});

		(state.minimizeOnboarding as () => void)();
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'coachmarks',
			onboardingCoachmarkStep: pausedStep,
			onboardingPausedCoachmarkStep: null,
			onboardingActiveTarget: pausedTarget,
		});
	});

	it('finishes the controls tour into the optional upsell for free users', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.markOnboardingTaskComplete as (taskId: string) => void)('create-node');
		(state.markOnboardingTaskComplete as (taskId: string) => void)('try-pattern');
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');

		for (let index = 0; index < ONBOARDING_COACHMARKS.length; index += 1) {
			(state.advanceOnboardingCoachmark as () => void)();
		}

		expect(harness.getState()).toMatchObject({
			onboardingTasks: {
				'create-node': true,
				'try-pattern': true,
				'know-controls': true,
			},
			onboardingStatus: 'upsell',
			hasSeenOnboardingUpsell: true,
		});
	});

	it('restarts and restores v2 state cleanly', () => {
		window.localStorage.setItem(
			getOnboardingStorageKey('user-1'),
			JSON.stringify({
				onboardingStatus: 'checklist',
				onboardingTasks: {
					'create-node': true,
					'try-pattern': false,
					'know-controls': false,
				},
				onboardingIsMinimized: true,
			})
		);

		const harness = createOnboardingSliceHarness();
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingIsMinimized: true,
			onboardingTasks: {
				'create-node': true,
				'try-pattern': false,
				'know-controls': false,
			},
		});

		(harness.getState().restartOnboarding as () => void)();

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'intro',
			onboardingIsMinimized: false,
			hasCompletedOnboarding: false,
			hasSkippedOnboarding: false,
			onboardingViewport: 'desktop',
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': false,
			},
		});
	});

	it('keeps checklist minimize/resume behavior unchanged', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.startOnboarding as () => void)();
		(state.minimizeOnboarding as () => void)();

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			onboardingCoachmarkStep: 0,
			onboardingActiveTarget: null,
		});

		(state.resumeOnboarding as () => void)();
		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'checklist',
			onboardingIsMinimized: false,
			onboardingCreateNodeStep: 'toolbar',
			onboardingActiveTarget: 'add-node',
		});
	});
});
