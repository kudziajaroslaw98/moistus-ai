import { useSavedRecipes } from '@/hooks/extensions/use-saved-recipes';
import type { SavedRecipe } from '@/lib/extensions/recipe-schema';
import useAppStore from '@/store/mind-map-store';
import { render } from '@testing-library/react';
import { RecipeContributionsRegistrar } from './recipe-contributions-registrar';

jest.mock('@/store/mind-map-store', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/hooks/extensions/use-saved-recipes', () => ({ useSavedRecipes: jest.fn() }));

const saved = (id: string): SavedRecipe => ({
	id,
	definition: {
		title: `Recipe ${id}`,
		description: '',
		icon: 'alert',
		scope: 'node',
		instruction: 'Do it.',
		output: { maxItems: 2, nodeTypes: ['defaultNode'], labels: [] },
	},
	visibility: 'private',
	sourceRecipeId: null,
	installCount: 0,
	updatedAt: '2026-10-04T12:00:00.000Z',
});

describe('RecipeContributionsRegistrar', () => {
	it('registers saved recipes and removes them when they change or unmount', () => {
		const unregisterA = jest.fn();
		const unregisterB = jest.fn();
		const registerContribution = jest
			.fn()
			.mockReturnValueOnce(unregisterA)
			.mockReturnValueOnce(unregisterB);
		(useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
			selector({ registerContribution })
		);
		const mockedUseSavedRecipes = useSavedRecipes as jest.Mock;
		mockedUseSavedRecipes.mockReturnValue({ recipes: [saved('a')] });

		const { rerender, unmount } = render(<RecipeContributionsRegistrar />);
		expect(registerContribution).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'recipe:a', owner: 'user', group: 'recipes' })
		);

		mockedUseSavedRecipes.mockReturnValue({ recipes: [saved('b')] });
		rerender(<RecipeContributionsRegistrar />);
		expect(unregisterA).toHaveBeenCalledTimes(1);
		expect(registerContribution).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: 'recipe:b' })
		);

		unmount();
		expect(unregisterB).toHaveBeenCalledTimes(1);
	});
});
