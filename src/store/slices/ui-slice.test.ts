import type { UIStateSlice } from '@/store/app-state';
import type { StateCreator, StoreApi } from 'zustand';

jest.mock('@/components/node-editor/core/commands/node-commands', () => ({
	nodeCommands: [],
}))

type UiSliceHarnessState = UIStateSlice & {
	currentUser: { id: string } | null;
	mindMap: { user_id: string } | null;
	permissions: { can_edit: boolean };
	nodes: Array<{ id?: string; data: { node_type?: string } }>;
}

type UiSliceHarnessCreator = StateCreator<
	UiSliceHarnessState,
	[],
	[],
	UIStateSlice
>;

type UiSliceHarnessSet = Parameters<UiSliceHarnessCreator>[0];
type UiSliceHarnessGet = Parameters<UiSliceHarnessCreator>[1];

function createUiSliceHarness(overrides: Partial<UiSliceHarnessState> = {}) {
	const { createUiStateSlice } =
		require('@/store/slices/ui-slice') as typeof import('@/store/slices/ui-slice');
	const typedCreateUiStateSlice =
		createUiStateSlice as unknown as UiSliceHarnessCreator;

	let state = {
		currentUser: { id: 'user-1' },
		mindMap: { user_id: 'user-1' },
		permissions: { can_edit: true },
		nodes: [],
		...overrides,
	} as UiSliceHarnessState;

	const set: UiSliceHarnessSet = (partial) => {
		const patch =
			typeof partial === 'function'
				? partial(state)
				: partial;

		state = { ...state, ...(patch ?? {}) };
	};

	const get: UiSliceHarnessGet = () => state;
	const slice = typedCreateUiStateSlice(set, get, {} as StoreApi<UiSliceHarnessState>);
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
