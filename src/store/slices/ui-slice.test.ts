jest.mock('@/components/node-editor/core/commands/node-commands', () => ({
	nodeCommands: [],
}))

function createUiSliceHarness(overrides: Record<string, unknown> = {}) {
	const { createUiStateSlice } =
		require('@/store/slices/ui-slice') as typeof import('@/store/slices/ui-slice');

	let state: Record<string, unknown> = {
		currentUser: { id: 'user-1' },
		mindMap: { user_id: 'user-1' },
		permissions: { can_edit: true },
		nodes: [],
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
	const slice = createUiStateSlice(set as never, get as never, {} as never);
	state = { ...state, ...slice };

	return {
		getState: () => state,
	};
}

describe('ui slice', () => {
	it('preserves an empty initialValue when opening the node editor', () => {
		const harness = createUiSliceHarness();

		(harness.getState().openNodeEditor as (options: {
			mode: 'create' | 'edit';
			position: { x: number; y: number };
			initialValue?: string | null;
			onboardingSource?: 'onboarding-pattern' | null;
		}) => void)({
			mode: 'create',
			position: { x: 0, y: 0 },
			initialValue: '',
			onboardingSource: null,
		});

		expect(harness.getState().nodeEditor).toMatchObject({
			initialValue: '',
			onboardingSource: null,
		});
	});
});
