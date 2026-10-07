import type { RecipesPanelView } from '@/types/extensions';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { create } from 'zustand';

type PanelState = {
	popoverOpen: { recipes: boolean };
	recipesPanelView: RecipesPanelView;
	setPopoverOpen: (patch: { recipes: boolean }) => void;
	setRecipesPanelView: (view: RecipesPanelView) => void;
};

const mockStore = create<PanelState>((set) => ({
	popoverOpen: { recipes: true },
	recipesPanelView: { mode: 'list' },
	setPopoverOpen: (patch) =>
		set((state) => ({ popoverOpen: { ...state.popoverOpen, ...patch } })),
	setRecipesPanelView: (view) =>
		set({
			recipesPanelView: view.mode === 'edit' ? { ...view, instance: view.instance ?? 1 } : view,
		}),
}));

// Resolved at call time: jest.mock factories run before this module's constants exist.
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: PanelState) => unknown) => mockStore(selector),
}));

jest.mock('./recipe-list', () => ({
	RecipeList: ({ onCreate }: { onCreate: (initial: null) => void }) => (
		<button onClick={() => onCreate(null)} type='button'>
			Start a recipe
		</button>
	),
}));

jest.mock('./recipe-editor', () => ({
	RecipeEditor: ({
		onDirtyChange,
		onClose,
	}: {
		onDirtyChange: (isDirty: boolean) => void;
		onClose: () => void;
	}) => (
		<>
			<button onClick={() => onDirtyChange(true)} type='button'>
				Make a change
			</button>
			<button onClick={onClose} type='button'>
				Close editor
			</button>
		</>
	),
}));

import { RecipesPanel } from './recipes-panel';

beforeEach(() => {
	act(() =>
		mockStore.setState({ popoverOpen: { recipes: true }, recipesPanelView: { mode: 'list' } })
	);
});

describe('RecipesPanel', () => {
	it('moves between the list and the editor', async () => {
		const user = userEvent.setup();
		render(<RecipesPanel />);

		expect(screen.getByRole('heading', { name: 'Recipes' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Start a recipe' }));

		expect(screen.getByRole('heading', { name: 'New recipe' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /all recipes/i }));

		expect(screen.getByRole('heading', { name: 'Recipes' })).toBeInTheDocument();
	});

	it('asks before throwing away unsaved edits', async () => {
		const user = userEvent.setup();
		render(<RecipesPanel />);
		await user.click(screen.getByRole('button', { name: 'Start a recipe' }));
		await user.click(screen.getByRole('button', { name: 'Make a change' }));

		await user.click(screen.getByRole('button', { name: /all recipes/i }));
		expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Keep editing' }));
		expect(screen.getByRole('heading', { name: 'New recipe' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Close editor' }));
		await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
		expect(mockStore.getState().popoverOpen.recipes).toBe(false);
		expect(mockStore.getState().recipesPanelView).toEqual({ mode: 'list' });
	});

	it('closes straight away when nothing changed', async () => {
		const user = userEvent.setup();
		render(<RecipesPanel />);

		await user.click(screen.getByRole('button', { name: 'Close panel' }));

		expect(mockStore.getState().popoverOpen.recipes).toBe(false);
	});
});
