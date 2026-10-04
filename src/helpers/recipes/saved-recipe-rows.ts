import { createServiceRoleClient } from '@/helpers/supabase/server';
import {
	recipeDefinitionSchema,
	type RecipeVisibility,
	type SavedRecipe,
	type SharedRecipe,
} from '@/lib/extensions/recipe-schema';

export const SAVED_RECIPE_COLUMNS =
	'id, definition, visibility, source_recipe_id, install_count, updated_at';

interface SavedRecipeRow {
	id: string;
	definition: unknown;
	visibility: RecipeVisibility;
	source_recipe_id: string | null;
	install_count: number;
	updated_at: string;
}

/**
 * Maps an `ai_recipes` row to the API shape. Rows can be written directly through the
 * Data API, so the definition is re-validated and invalid rows are dropped.
 */
export function toSavedRecipe(row: SavedRecipeRow): SavedRecipe | null {
	const definition = recipeDefinitionSchema.safeParse(row.definition);
	if (!definition.success) return null;

	return {
		id: row.id,
		definition: definition.data,
		visibility: row.visibility,
		sourceRecipeId: row.source_recipe_id,
		installCount: row.install_count,
		updatedAt: row.updated_at,
	};
}

export function toSavedRecipes(rows: SavedRecipeRow[] | null): SavedRecipe[] {
	return (rows ?? [])
		.map(toSavedRecipe)
		.filter((recipe): recipe is SavedRecipe => recipe !== null);
}

/**
 * Loads a recipe shared by link. Unlisted recipes are not readable through RLS (so they
 * can't be listed), hence the service role; private recipes are reported as missing.
 */
export async function loadSharedRecipe(
	id: string
): Promise<(SharedRecipe & { ownerId: string }) | null> {
	const admin = createServiceRoleClient();
	const { data: row } = await admin
		.from('ai_recipes')
		.select('id, user_id, definition, visibility, install_count')
		.eq('id', id)
		.maybeSingle();

	if (!row || row.visibility !== 'unlisted') return null;
	const definition = recipeDefinitionSchema.safeParse(row.definition);
	if (!definition.success) return null;

	const { data: profile } = await admin
		.from('user_profiles')
		.select('display_name')
		.eq('user_id', row.user_id)
		.maybeSingle();

	return {
		id: row.id,
		definition: definition.data,
		authorName: profile?.display_name ?? null,
		installCount: row.install_count,
		ownerId: row.user_id,
	};
}
