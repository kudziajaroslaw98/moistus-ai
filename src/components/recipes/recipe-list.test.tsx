import { useSavedRecipes } from '@/hooks/extensions/use-saved-recipes';
import type { SavedRecipe } from '@/lib/extensions/recipe-schema';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { duplicateDefinition, RecipeList } from './recipe-list';

jest.mock('@/hooks/extensions/use-saved-recipes', () => {
	class RecipeRequestError extends Error {}
	return { useSavedRecipes: jest.fn(), RecipeRequestError };
});
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const premortem: SavedRecipe = {
	id: 'r-1',
	definition: {
		title: 'Pre-mortem',
		description: 'Imagine this failed',
		icon: 'alert',
		scope: 'node',
		instruction: 'List the likely causes.',
		output: { maxItems: 4, nodeTypes: ['defaultNode', 'taskNode'], labels: ['risk'] },
	},
	visibility: 'private',
	sourceRecipeId: null,
	installCount: 0,
	updatedAt: '2026-10-04T12:00:00.000Z',
};

const updateRecipe = jest.fn();
const deleteRecipe = jest.fn();

function setup(overrides: Partial<ReturnType<typeof useSavedRecipes>> = {}) {
	(useSavedRecipes as jest.Mock).mockReturnValue({
		recipes: [premortem],
		isLoading: false,
		error: undefined,
		canSaveRecipes: true,
		updateRecipe,
		deleteRecipe,
		...overrides,
	});
	const onEdit = jest.fn();
	const onCreate = jest.fn();
	render(<RecipeList onCreate={onCreate} onEdit={onEdit} />);
	return { onEdit, onCreate, user: userEvent.setup() };
}

beforeEach(() => jest.clearAllMocks());

describe('RecipeList', () => {
	it('lists your recipes and the starters with a short summary', () => {
		setup();

		expect(screen.getByRole('heading', { name: 'Your recipes' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Starters' })).toBeInTheDocument();
		expect(screen.getByText('One idea · up to 4 · Note, Task')).toBeInTheDocument();
		expect(screen.getByText('SWOT this branch')).toBeInTheDocument();
		expect(screen.getByText('1 of 50 recipes')).toBeInTheDocument();
	});

	it('filters recipes and starters as you search', async () => {
		const { user } = setup();

		await user.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'swot');

		expect(screen.queryByText('Pre-mortem')).not.toBeInTheDocument();
		expect(screen.getByText('SWOT this branch')).toBeInTheDocument();
		expect(screen.getByText('No recipes match your search.')).toBeInTheDocument();
	});

	it('opens a recipe for editing and duplicates starters as new recipes', async () => {
		const { user, onEdit, onCreate } = setup();

		await user.click(screen.getByRole('button', { name: /^pre-mortem/i }));
		expect(onEdit).toHaveBeenCalledWith(premortem);

		await user.click(screen.getByRole('button', { name: 'Options for SWOT this branch' }));
		await user.click(await screen.findByRole('menuitem', { name: /duplicate to edit/i }));
		expect(onCreate).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'SWOT this branch (copy)', scope: 'branch' })
		);
	});

	it('copies a share link after making the recipe readable by link', async () => {
		updateRecipe.mockResolvedValue({ ...premortem, visibility: 'unlisted' });
		const { user } = setup();
		const writeText = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

		await user.click(screen.getByRole('button', { name: 'Options for Pre-mortem' }));
		await user.click(await screen.findByRole('menuitem', { name: /copy share link/i }));

		expect(updateRecipe).toHaveBeenCalledWith('r-1', { visibility: 'unlisted' });
		expect(writeText).toHaveBeenCalledWith('http://localhost/recipes/r-1');
	});

	it('asks before deleting', async () => {
		deleteRecipe.mockResolvedValue(undefined);
		const { user } = setup();

		await user.click(screen.getByRole('button', { name: 'Options for Pre-mortem' }));
		await user.click(await screen.findByRole('menuitem', { name: /delete/i }));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText('Delete “Pre-mortem”?')).toBeInTheDocument();

		await user.click(within(dialog).getByRole('button', { name: 'Delete recipe' }));
		expect(deleteRecipe).toHaveBeenCalledWith('r-1');
	});

	it('shows starters only, with no actions, to guests', () => {
		setup({ canSaveRecipes: false, recipes: [] });

		expect(screen.queryByRole('heading', { name: 'Your recipes' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /options for/i })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /new recipe/i })).toBeDisabled();
	});
});

describe('duplicateDefinition', () => {
	it('keeps the name within the limit', () => {
		const copy = duplicateDefinition({ ...premortem.definition, title: 'x'.repeat(60) });
		expect(copy.title).toHaveLength(60);
		expect(copy.title.endsWith(' (copy)')).toBe(true);
	});
});
