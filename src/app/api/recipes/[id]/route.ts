import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	SAVED_RECIPE_COLUMNS,
	toSavedRecipe,
} from '@/helpers/recipes/saved-recipe-rows';
import {
	RECIPE_VISIBILITIES,
	recipeDefinitionSchema,
	type SavedRecipe,
} from '@/lib/extensions/recipe-schema';
import { z } from 'zod';

type RecipeParams = { id: string };

const recipeIdSchema = z.string().uuid();

const updateRecipeSchema = z
	.object({
		definition: recipeDefinitionSchema.optional(),
		visibility: z.enum(RECIPE_VISIBILITIES).optional(),
	})
	.refine((body) => body.definition || body.visibility, 'Nothing to update');

/** Edit a saved recipe or change who can open it by link. Owner only (RLS). */
export const PATCH = withApiValidation<
	z.infer<typeof updateRecipeSchema>,
	SavedRecipe,
	RecipeParams
>(updateRecipeSchema, async (_req, body, supabase, user, params) => {
	const id = recipeIdSchema.safeParse(params?.id);
	if (!id.success) {
		return respondError('Recipe not found.', 404);
	}

	const { data, error } = await supabase
		.from('ai_recipes')
		.update({
			...(body.definition ? { definition: body.definition } : {}),
			...(body.visibility ? { visibility: body.visibility } : {}),
		})
		.eq('id', id.data)
		.eq('user_id', user.id)
		.select(SAVED_RECIPE_COLUMNS)
		.maybeSingle();

	if (error) {
		return respondError('Failed to update recipe.', 500, error.message);
	}
	const recipe = data ? toSavedRecipe(data) : null;
	if (!recipe) {
		return respondError('Recipe not found.', 404);
	}
	return respondSuccess(recipe);
});

export const DELETE = withApiValidation<
	Record<string, never>,
	{ id: string },
	RecipeParams
>(z.object({}), async (_req, _body, supabase, user, params) => {
	const id = recipeIdSchema.safeParse(params?.id);
	if (!id.success) {
		return respondError('Recipe not found.', 404);
	}

	const { data, error } = await supabase
		.from('ai_recipes')
		.delete()
		.eq('id', id.data)
		.eq('user_id', user.id)
		.select('id')
		.maybeSingle();

	if (error) {
		return respondError('Failed to delete recipe.', 500, error.message);
	}
	if (!data) {
		return respondError('Recipe not found.', 404);
	}
	return respondSuccess({ id: data.id });
});
