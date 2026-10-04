import { suggestionRouteNodeTypes } from '@/helpers/ai-suggestion-postprocess';
import { z } from 'zod';

/** What a recipe runs on: one node (with neighbours), a node's subtree, or the whole map. */
export const RECIPE_SCOPES = ['node', 'branch', 'map'] as const;
export type RecipeScope = (typeof RECIPE_SCOPES)[number];

export const RECIPE_ICON_KEYS = [
	'alert',
	'grid',
	'help',
	'sparkles',
	'lightbulb',
	'list-checks',
	'file-text',
	'chef-hat',
] as const;
export type RecipeIconKey = (typeof RECIPE_ICON_KEYS)[number];

/** Node types a recipe may create: the same safe typed set as AI suggestions. */
export const RECIPE_NODE_TYPES = suggestionRouteNodeTypes;
export type RecipeNodeType = (typeof RECIPE_NODE_TYPES)[number];

export const RECIPE_LIMITS = {
	title: 60,
	description: 140,
	instruction: 2000,
	maxItems: 6,
	labels: 8,
	labelLength: 30,
} as const;

const hasNoDuplicates = (values: readonly string[]) =>
	new Set(values).size === values.length;

export const recipeDefinitionSchema = z.object({
	title: z.string().trim().min(1).max(RECIPE_LIMITS.title),
	description: z.string().trim().max(RECIPE_LIMITS.description),
	icon: z.enum(RECIPE_ICON_KEYS),
	scope: z.enum(RECIPE_SCOPES),
	instruction: z.string().trim().min(1).max(RECIPE_LIMITS.instruction),
	output: z.object({
		maxItems: z.number().int().min(1).max(RECIPE_LIMITS.maxItems),
		nodeTypes: z
			.array(z.enum(RECIPE_NODE_TYPES))
			.min(1)
			.refine(hasNoDuplicates, 'Node types must be unique'),
		labels: z
			.array(z.string().trim().min(1).max(RECIPE_LIMITS.labelLength))
			.max(RECIPE_LIMITS.labels)
			.refine(hasNoDuplicates, 'Labels must be unique'),
	}),
});

export type RecipeDefinition = z.infer<typeof recipeDefinitionSchema>;

/** A runnable recipe: saved (uuid), starter (`starter:*`) or an unsaved draft. */
export interface RecipeRef {
	id: string;
	definition: RecipeDefinition;
}

export const recipeRefSchema = z.object({
	id: z.string().trim().min(1).max(100),
	definition: recipeDefinitionSchema,
});
