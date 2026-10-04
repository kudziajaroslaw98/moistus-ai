import { BUILTIN_AI_ACTIONS } from '@/lib/extensions/builtin-ai-actions';
import { BUILTIN_COMMANDS } from '@/lib/extensions/builtin-commands';
import type { AppState } from '@/store/app-state';
import type { Contribution } from '@/types/extensions';
import { Puzzle } from 'lucide-react';
import { create } from 'zustand';
import { createExtensionsSlice } from './extensions-slice';

const createStore = () =>
	create<AppState>(
		(set, get, api) => createExtensionsSlice(set, get, api) as AppState
	);

const contribution = (overrides: Partial<Contribution> = {}): Contribution => ({
	id: 'com.example.hello',
	title: 'Say hello',
	icon: Puzzle,
	owner: 'com.example',
	scopes: ['map'],
	placements: ['commandPalette'],
	run: jest.fn(),
	...overrides,
});

describe('extensions slice', () => {
	it('starts with the built-in AI actions and commands', () => {
		const store = createStore();

		expect(store.getState().contributions.map((c) => c.id)).toEqual(
			[...BUILTIN_AI_ACTIONS, ...BUILTIN_COMMANDS].map((c) => c.id)
		);
	});

	it('registers and unregisters an entry', () => {
		const store = createStore();
		const unregister = store.getState().registerContribution(contribution());

		expect(store.getState().contributions.at(-1)?.id).toBe('com.example.hello');

		unregister();
		expect(
			store.getState().contributions.some((c) => c.id === 'com.example.hello')
		).toBe(false);
	});

	it('replaces an entry with the same id in place', () => {
		const store = createStore();
		const { registerContribution } = store.getState();
		registerContribution(contribution());
		registerContribution(contribution({ title: 'Say hi' }));

		const matches = store
			.getState()
			.contributions.filter((c) => c.id === 'com.example.hello');
		expect(matches).toHaveLength(1);
		expect(matches[0].title).toBe('Say hi');
	});

	it('does not remove a newer replacement when an old unregister runs', () => {
		const store = createStore();
		const { registerContribution } = store.getState();
		const unregisterFirst = registerContribution(contribution());
		registerContribution(contribution({ title: 'Say hi' }));

		unregisterFirst();

		expect(
			store.getState().contributions.find((c) => c.id === 'com.example.hello')
				?.title
		).toBe('Say hi');
	});
});
