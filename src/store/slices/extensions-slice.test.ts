import { BUILTIN_AI_ACTIONS } from '@/lib/extensions/builtin-ai-actions';
import { BUILTIN_COMMANDS } from '@/lib/extensions/builtin-commands';
import { STARTER_RECIPE_CONTRIBUTIONS } from '@/lib/extensions/recipe-contributions';
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
	it('starts with the built-in AI actions, commands and starter recipes', () => {
		const store = createStore();

		expect(store.getState().contributions.map((c) => c.id)).toEqual(
			[
				...BUILTIN_AI_ACTIONS,
				...BUILTIN_COMMANDS,
				...STARTER_RECIPE_CONTRIBUTIONS,
			].map((c) => c.id)
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

describe('recipes panel view', () => {
	const createPanelStore = () => {
		const setPopoverOpen = jest.fn();
		const store = create<AppState>(
			(set, get, api) =>
				({ ...createExtensionsSlice(set, get, api), setPopoverOpen }) as unknown as AppState
		);
		return { store, setPopoverOpen };
	};

	it('opens on the list by default', () => {
		const { store, setPopoverOpen } = createPanelStore();

		store.getState().openRecipesPanel();

		expect(store.getState().recipesPanelView).toEqual({ mode: 'list' });
		expect(setPopoverOpen).toHaveBeenCalledWith({ recipes: true });
	});

	it('gives each new editor view its own instance but keeps one passed explicitly', () => {
		const { store } = createPanelStore();

		store.getState().openRecipesPanel({ mode: 'edit', recipeId: null, initial: null });
		const first = store.getState().recipesPanelView;
		store.getState().openRecipesPanel({ mode: 'edit', recipeId: null, initial: null });
		const second = store.getState().recipesPanelView;

		expect(first.mode === 'edit' && second.mode === 'edit').toBe(true);
		if (first.mode !== 'edit' || second.mode !== 'edit') return;
		expect(second.instance).not.toBe(first.instance);

		store.getState().setRecipesPanelView({
			mode: 'edit',
			recipeId: 'saved',
			initial: null,
			instance: second.instance,
		});
		const saved = store.getState().recipesPanelView;
		expect(saved.mode === 'edit' && saved.instance).toBe(second.instance);
	});
});
