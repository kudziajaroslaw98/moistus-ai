import {
	ONBOARDING_COACHMARKS,
	ONBOARDING_MOBILE_COACHMARKS,
	ONBOARDING_STORAGE_KEY,
} from '@/constants/onboarding';

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

	it('explore on my own hides the overlay and keeps the checklist pill', () => {
		const harness = createOnboardingSliceHarness();

		(harness.getState().maybeStartOnboarding as () => void)();
		(harness.getState().exploreOnboardingIndependently as () => void)();

		expect(harness.getState()).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			hasSkippedOnboarding: true,
		});
		expect(
			JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) || '{}')
		).toMatchObject({
			onboardingStatus: 'hidden',
			onboardingIsMinimized: true,
			hasSkippedOnboarding: true,
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
				'create-node': false,
				'try-pattern': true,
				'know-controls': false,
			},
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
			ONBOARDING_STORAGE_KEY,
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
});
