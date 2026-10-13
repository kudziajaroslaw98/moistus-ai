import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	loadSharedRecipe,
	SAVED_RECIPE_COLUMNS,
	toSavedRecipe,
} from '@/helpers/recipes/saved-recipe-rows';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { MAX_SAVED_RECIPES, type SavedRecipe } from '@/lib/extensions/recipe-schema';
import { z } from 'zod';

/**
 * Adds a shared recipe to the caller's recipes as their own copy. Later edits by the
 * author never change the copy. Adding the same recipe twice returns the first copy.
 */
export const POST = withApiValidation<Record<string, never>, SavedRecipe, { id: string }>(
	z.object({}),
	async (_req, _body, _supabase, user, params) => {
		if (user.is_anonymous) {
			return respondError('Create an account to save recipes.', 403, 'Anonymous user');
		}

		const id = z.string().uuid().safeParse(params?.id);
		const shared = id.success ? await loadSharedRecipe(id.data) : null;
		if (!id.success || !shared) {
			return respondError('Recipe not found.', 404);
		}

		// source_recipe_id and install_count are system-managed, so copies are written
		// with the service role on the caller's behalf.
		const admin = createServiceRoleClient();

		const { data: existing } = await admin
			.from('ai_recipes')
			.select(SAVED_RECIPE_COLUMNS)
			.eq('user_id', user.id)
			.eq('source_recipe_id', shared.id)
			.limit(1)
			.maybeSingle();
		const existingCopy = existing ? toSavedRecipe(existing) : null;
		if (existingCopy) {
			return respondSuccess(existingCopy);
		}

		const { count } = await admin
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

		const { data, error } = await admin
			.from('ai_recipes')
			.insert({
				user_id: user.id,
				definition: shared.definition,
				source_recipe_id: shared.id,
			})
			.select(SAVED_RECIPE_COLUMNS)
			.single();
		const copy = data ? toSavedRecipe(data) : null;
		if (error || !copy) {
			return respondError('Failed to add recipe.', 500, error?.message);
		}

		if (shared.ownerId !== user.id) {
			// A display counter: a lost update under concurrent adds is acceptable.
			await admin
				.from('ai_recipes')
				.update({ install_count: shared.installCount + 1 })
				.eq('id', shared.id);
		}

		return respondSuccess(copy, 201);
	}
);
