import {
	ONBOARDING_COACHMARKS,
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

	it('completes the first two tasks from real editor events', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.startOnboarding as () => void)();
		(state.handleOnboardingNodeEditorOpened as (mode: 'create' | 'edit') => void)(
			'create'
		);
		(
			state.handleOnboardingNodeCreated as (details: {
				mode: 'create' | 'edit';
				usedPatterns: boolean;
			}) => void
		)({
			mode: 'create',
			usedPatterns: true,
		});

		expect(harness.getState().onboardingTasks).toMatchObject({
			'create-node': true,
			'try-pattern': true,
			'know-controls': false,
		});
	});

	it('finishes the controls tour into the optional upsell', () => {
		const harness = createOnboardingSliceHarness();
		const state = harness.getState();

		(state.markOnboardingTaskComplete as (taskId: string) => void)('create-node');
		(state.markOnboardingTaskComplete as (taskId: string) => void)('try-pattern');
		(state.startOnboardingTask as (taskId: string) => void)('know-controls');

		for (let index = 0; index < ONBOARDING_COACHMARKS.length; index += 1) {
			(state.advanceOnboardingCoachmark as () => void)();
		}

		expect(harness.getState().onboardingTasks).toMatchObject({
			'create-node': true,
			'try-pattern': true,
			'know-controls': true,
		});
		expect(harness.getState()).toMatchObject({
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
			onboardingTasks: {
				'create-node': false,
				'try-pattern': false,
				'know-controls': false,
			},
		});
	});
});
