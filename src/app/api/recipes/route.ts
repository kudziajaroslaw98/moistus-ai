import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	SAVED_RECIPE_COLUMNS,
	toSavedRecipe,
	toSavedRecipes,
} from '@/helpers/recipes/saved-recipe-rows';
import {
	MAX_SAVED_RECIPES,
	recipeDefinitionSchema,
	type SavedRecipe,
} from '@/lib/extensions/recipe-schema';
import { z } from 'zod';

/** The signed-in user's saved recipes, newest first. Guests have none. */
export const GET = withApiValidation<Record<string, never>, SavedRecipe[]>(
	z.object({}),
	async (_req, _body, supabase, user) => {
		if (user.is_anonymous) {
			return respondSuccess([]);
		}

		const { data, error } = await supabase
			.from('ai_recipes')
			.select(SAVED_RECIPE_COLUMNS)
			.eq('user_id', user.id)
			.order('updated_at', { ascending: false });

		if (error) {
			return respondError('Failed to load recipes.', 500, error.message);
		}
		return respondSuccess(toSavedRecipes(data));
	}
);

const createRecipeSchema = z.object({ definition: recipeDefinitionSchema });

export const POST = withApiValidation<z.infer<typeof createRecipeSchema>, SavedRecipe>(
	createRecipeSchema,
	async (_req, body, supabase, user) => {
		if (user.is_anonymous) {
			return respondError('Create an account to save recipes.', 403, 'Anonymous user');
		}

		const { count } = await supabase
			.from('ai_recipes')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id);
		if ((count ?? 0) >= MAX_SAVED_RECIPES) {
			return respondError(
				`You can save up to ${MAX_SAVED_RECIPES} recipes.`,
				409,
				'Recipe limit reached',
				{ code: 'RECIPE_LIMIT_REACHED', limit: MAX_SAVED_RECIPES }
			);
		}

		const { data, error } = await supabase
			.from('ai_recipes')
			.insert({ user_id: user.id, definition: body.definition })
			.select(SAVED_RECIPE_COLUMNS)
			.single();

		const recipe = data ? toSavedRecipe(data) : null;
		if (error || !recipe) {
			return respondError('Failed to save recipe.', 500, error?.message);
		}
		return respondSuccess(recipe, 201);
	}
);
