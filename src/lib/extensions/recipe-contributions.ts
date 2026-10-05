import { RECIPE_ICONS } from '@/lib/extensions/recipe-icons';
import type { RecipeRef } from '@/lib/extensions/recipe-schema';
import { STARTER_RECIPES } from '@/lib/extensions/starter-recipes';
import type { Contribution } from '@/types/extensions';

/** Contribution id for a recipe, so menus can register and replace it by recipe id. */
export const recipeContributionId = (recipeId: string) => `recipe:${recipeId}`;

/**
 * A recipe as a menu entry: listed under "Recipes" in the AI popover and the command
 * palette. Node and branch recipes act on a node; map recipes on the map.
 */
export function recipeToContribution(
	recipe: RecipeRef,
	owner: Contribution['owner']
): Contribution {
	const { definition } = recipe;

	return {
		id: recipeContributionId(recipe.id),
		title: definition.title,
		description: definition.description || undefined,
		icon: RECIPE_ICONS[definition.icon].icon,
		keywords: ['recipe', 'ai'],
		owner,
		group: 'recipes',
		scopes: [definition.scope === 'map' ? 'map' : 'node'],
		placements: ['aiMenu', 'commandPalette'],
		requiresEdit: true,
		requiresAIQuota: true,
		when: (ctx) => ctx.isMapReady,
		isBusy: (ctx) => ctx.getState().isStreaming,
		run: (ctx) => ctx.getState().runRecipe(recipe, ctx.nodeId),
	};
}

export const STARTER_RECIPE_CONTRIBUTIONS: Contribution[] = STARTER_RECIPES.filter(
	(recipe) => !recipe.hiddenFromMenus
).map((recipe) => recipeToContribution(recipe, 'builtin'));
