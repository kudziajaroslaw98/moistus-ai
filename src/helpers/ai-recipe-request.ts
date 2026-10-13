import { recipeRefSchema, type RecipeRef } from '@/lib/extensions/recipe-schema';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { UIMessage } from 'ai';
import { z } from 'zod';

export interface RecipeRunRequest {
	mapId: string;
	mapMeta?: { title?: string | null; description?: string | null };
	recipe: RecipeRef;
	/** Node the recipe runs on; null only for map-scoped recipes. */
	sourceNodeId: string | null;
	nodes: AppNode[];
	edges: AppEdge[];
}

const recipeRunRequestSchema = z.object({
	mapId: z.string().uuid(),
	mapMeta: z
		.object({
			title: z.string().nullish(),
			description: z.string().nullish(),
		})
		.nullish(),
	recipe: recipeRefSchema,
	sourceNodeId: z.string().min(1).nullable(),
	nodes: z.array(
		z
			.object({
				id: z.string().min(1),
				data: z.object({ content: z.string().nullable() }).passthrough(),
			})
			.passthrough()
	),
	edges: z.array(
		z
			.object({ source: z.string().min(1), target: z.string().min(1) })
			.passthrough()
	),
});

function getLastUserText(messages: UIMessage[]) {
	const lastUserMessage = messages.filter((message) => message.role === 'user').pop();
	const textPart = lastUserMessage?.parts.find((part) => part.type === 'text');

	if (!textPart || textPart.type !== 'text') {
		throw new Error('Invalid request format: User message not found.');
	}

	return textPart.text;
}

export function parseRecipeRunRequest(messages: UIMessage[]): RecipeRunRequest {
	const parsed = recipeRunRequestSchema.safeParse(
		JSON.parse(getLastUserText(messages))
	);
	if (!parsed.success) {
		throw new Error(`Invalid recipe request: ${parsed.error.issues[0]?.message}`);
	}

	const { recipe, sourceNodeId, mapMeta } = parsed.data;
	if (recipe.definition.scope !== 'map' && !sourceNodeId) {
		throw new Error('Select a node to run this recipe.');
	}

	return {
		mapId: parsed.data.mapId,
		mapMeta: mapMeta ?? undefined,
		recipe,
		sourceNodeId: recipe.definition.scope === 'map' ? null : sourceNodeId,
		nodes: parsed.data.nodes as AppNode[],
		edges: parsed.data.edges as AppEdge[],
	};
}
