import type { ContributionContext } from '@/types/extensions';
import { recipeToContribution, STARTER_RECIPE_CONTRIBUTIONS } from './recipe-contributions';
import type { RecipeRef } from './recipe-schema';

const recipe = (scope: RecipeRef['definition']['scope']): RecipeRef => ({
	id: 'abc',
	definition: {
		title: 'Weekly review',
		description: 'Open questions across the map',
		icon: 'lightbulb',
		scope,
		instruction: 'List open questions.',
		output: { maxItems: 3, nodeTypes: ['defaultNode'], labels: [] },
	},
});

const context = (runRecipe: jest.Mock, overrides: Partial<ContributionContext> = {}) =>
	({
		getState: () => ({ runRecipe, isStreaming: false }),
		scope: 'node',
		nodeId: 'node-1',
		canEdit: true,
		isMapReady: true,
		...overrides,
	}) as unknown as ContributionContext;

describe('recipeToContribution', () => {
	it('maps node and branch recipes to node scope and map recipes to map scope', () => {
		expect(recipeToContribution(recipe('node'), 'user').scopes).toEqual(['node']);
		expect(recipeToContribution(recipe('branch'), 'user').scopes).toEqual(['node']);
		expect(recipeToContribution(recipe('map'), 'user').scopes).toEqual(['map']);
	});

	it('is a quota-checked, edit-only entry in the Recipes group of every surface', () => {
		expect(recipeToContribution(recipe('node'), 'user')).toMatchObject({
			id: 'recipe:abc',
			group: 'recipes',
			placements: ['aiMenu', 'commandPalette'],
			requiresEdit: true,
			requiresAIQuota: true,
		});
	});

	it('runs the recipe on the context node', () => {
		const runRecipe = jest.fn();
		const value = recipe('branch');
		recipeToContribution(value, 'user').run(context(runRecipe));

		expect(runRecipe).toHaveBeenCalledWith(value, 'node-1');
	});

	it('waits for the map and for running streams', () => {
		const contribution = recipeToContribution(recipe('node'), 'user');
		const runRecipe = jest.fn();

		expect(contribution.when?.(context(runRecipe, { isMapReady: false }))).toBe(false);
		expect(
			contribution.isBusy?.({
				...context(runRecipe),
				getState: () => ({ isStreaming: true }),
			} as unknown as ContributionContext)
		).toBe(true);
	});

	it('lists starters in menus except Counterpoints', () => {
		expect(STARTER_RECIPE_CONTRIBUTIONS.map((entry) => entry.title)).toEqual([
			'SWOT this branch',
			'Study questions',
		]);
	});
});
