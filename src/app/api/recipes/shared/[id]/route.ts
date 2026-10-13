import { respondError, respondSuccess } from '@/helpers/api/responses';
import { loadSharedRecipe } from '@/helpers/recipes/saved-recipe-rows';
import type { SharedRecipe } from '@/lib/extensions/recipe-schema';
import { z } from 'zod';

/** A recipe shared by link. Public: anyone with the link may read it before adding it. */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const id = z.string().uuid().safeParse((await params).id);
	if (!id.success) {
		return respondError('Recipe not found.', 404);
	}

	const shared = await loadSharedRecipe(id.data);
	if (!shared) {
		return respondError('Recipe not found.', 404);
	}

	const { ownerId: _ownerId, ...recipe } = shared;
	return respondSuccess<SharedRecipe>(recipe);
}
