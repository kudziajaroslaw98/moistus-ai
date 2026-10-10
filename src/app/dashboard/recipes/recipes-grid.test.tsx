const mockOnCreate = jest.fn();
const mockOnEdit = jest.fn();

jest.mock('@/components/dashboard/dashboard-shell-context', () => ({
	useDashboardSearch: () => ({ query: '', setQuery: jest.fn() }),
}));

let mockCanSave = true;
const mockSavedRecipe = {
	id: 'recipe-1',
	visibility: 'private',
	definition: {
		title: 'Pre-mortem',
		description: 'Imagine this failed',
		icon: 'chef-hat',
		scope: 'branch',
		instruction: 'List the likely causes.',
		output: { maxItems: 4, nodeTypes: ['defaultNode'], labels: [] },
	},
};
jest.mock('@/hooks/extensions/use-saved-recipes', () => ({
	RecipeRequestError: class extends Error {},
	useSavedRecipes: () => ({
		recipes: mockCanSave ? [mockSavedRecipe] : [],
		isLoading: false,
		error: null,
		canSaveRecipes: mockCanSave,
		updateRecipe: jest.fn(),
		deleteRecipe: jest.fn(),
	}),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipesGrid } from './recipes-grid';

beforeEach(() => {
	jest.clearAllMocks();
	mockCanSave = true;
});

describe('RecipesGrid', () => {
	it('gives your recipes "Edit" and starters "Duplicate", each with a menu', async () => {
		const user = userEvent.setup();
		render(<RecipesGrid onCreate={mockOnCreate} onEdit={mockOnEdit} />);

		expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
		expect(
			screen.getAllByRole('button', { name: 'Duplicate' }).length
		).toBeGreaterThan(0);
		expect(
			screen.getByRole('button', { name: 'Options for Pre-mortem' })
		).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Edit' }));
		expect(mockOnEdit).toHaveBeenCalledWith(mockSavedRecipe);
	});

	it('ends the grid with a New recipe tile that shows how many are saved', async () => {
		const user = userEvent.setup();
		render(<RecipesGrid onCreate={mockOnCreate} onEdit={mockOnEdit} />);

		expect(screen.getByText('1 of 50 saved')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /New recipe/ }));
		expect(mockOnCreate).toHaveBeenCalledWith(null);
	});

	it('shows only starters, read-only, to people who cannot save recipes', () => {
		mockCanSave = false;
		render(<RecipesGrid onCreate={mockOnCreate} onEdit={mockOnEdit} />);

		expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
		expect(screen.queryByText(/New recipe/)).not.toBeInTheDocument();
		expect(screen.getByText(/Create an account to save/)).toBeInTheDocument();
	});
});
