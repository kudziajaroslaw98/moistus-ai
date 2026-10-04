import { resolveAliasedNodeId } from '@/helpers/ai-id-alias-map';
import type { RecipePromptContext } from '@/helpers/ai-recipe-context';
import {
	getSuggestionSourceDetails,
	isDuplicateSuggestion,
	normalizeStructuredPayload,
	suggestionNodePayloadSchema,
	type SuggestionComparisonEntry,
} from '@/helpers/ai-suggestion-postprocess';
import type {
	RecipeIconKey,
	RecipeNodeType,
	RecipeRef,
} from '@/lib/extensions/recipe-schema';
import type { AppNode } from '@/types/app-node';
import type { SuggestionNodePayload } from '@/types/ghost-node';
import { z } from 'zod';

const aiNodeIdSchema = z.union([z.number().int().positive(), z.string().min(1)]);

/**
 * Output schema for one recipe run. OpenAI strict structured outputs require every
 * key to be required, so optional values are nullable (never .optional()/.partial()).
 * Node types and labels come from the recipe, so the model can't step outside them.
 */
export function buildRecipeOutputSchema(definition: RecipeRef['definition']) {
	const nodeTypes = definition.output.nodeTypes as [RecipeNodeType, ...RecipeNodeType[]];
	const labels = [...new Set(definition.output.labels)];
	const relationshipType =
		labels.length > 0
			? z.enum(labels as [string, ...string[]]).nullable()
			: z.string().nullable();

	return z.object({
		content: z.string().describe('The suggestion text, plain text only.'),
		nodeType: z.enum(nodeTypes).describe('One of the allowed node types.'),
		nodePayload: suggestionNodePayloadSchema.describe(
			'Typed payload for task/question/annotation/code nodes, otherwise null.'
		),
		confidence: z.number().min(0).max(1).describe('Confidence from 0.0 to 1.0.'),
		context: z.object({
			sourceNodeId: aiNodeIdSchema
				.nullable()
				.describe('NODE id this suggestion attaches to.'),
			relationshipType: relationshipType.describe(
				'Label for the connection to the attached node.'
			),
		}),
	});
}

export type RecipeOutputSchema = ReturnType<typeof buildRecipeOutputSchema>;

const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MARKDOWN_IMAGE_REFERENCE = /!\[[^\]]*\]\[[^\]]*\]/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g;
const LINK_DEFINITION = /^[ \t]*\[[^\]]+\]:[ \t]*\S+.*$/gm;
const HTML_TAG = /<\/?[a-z][^>]*>/gi;

/**
 * Approved nodes render markdown, and an image there loads its URL straight away. A
 * shared recipe could use that to send map text to another site, so results keep
 * plain text only: images and HTML are removed and links become their text.
 */
export function sanitizeRecipeText(value: string): string {
	return value
		.replace(MARKDOWN_IMAGE, '')
		.replace(MARKDOWN_IMAGE_REFERENCE, '')
		.replace(MARKDOWN_LINK, '$1')
		.replace(LINK_DEFINITION, '')
		.replace(HTML_TAG, '')
		.replace(/[ \t]+$/gm, '')
		.trim();
}

function sanitizePayload(
	payload: SuggestionNodePayload | null
): SuggestionNodePayload | null {
	if (!payload) return null;
	const taskTexts = payload.taskTexts
		?.map(sanitizeRecipeText)
		.filter((task) => task.length > 0);

	return {
		...payload,
		title: payload.title ? sanitizeRecipeText(payload.title) || null : null,
		answer: payload.answer ? sanitizeRecipeText(payload.answer) || null : null,
		taskTexts: taskTexts && taskTexts.length > 0 ? taskTexts : null,
	};
}

export interface RecipeSuggestion {
	id: string;
	content: string;
	nodeType: RecipeNodeType;
	nodePayload: SuggestionNodePayload | null;
	confidence: number;
	position: { x: number; y: number };
	context: {
		sourceNodeId: string | null;
		targetNodeId: null;
		relationshipType: string | null;
		trigger: 'magic-wand';
		recipe: { id: string; title: string; icon: RecipeIconKey };
	};
}

export interface ProcessedRecipeSuggestion {
	suggestion: RecipeSuggestion;
	comparisonEntry: SuggestionComparisonEntry;
}

/** Existing context nodes, so results that only restate the map are dropped. */
export function getRecipeComparisonEntries(
	graph: RecipePromptContext['graph']
): SuggestionComparisonEntry[] {
	return graph.nodes.map((node) => ({ content: node.text, sourceNodeId: null }));
}

export function processRecipeElement(params: {
	element: unknown;
	schema: RecipeOutputSchema;
	recipe: RecipeRef;
	promptContext: Pick<
		RecipePromptContext,
		'aliasMap' | 'validAnchorNodeIds' | 'focusNodeId'
	>;
	existingEntries: SuggestionComparisonEntry[];
	emittedEntries: SuggestionComparisonEntry[];
	createId: () => string;
}): ProcessedRecipeSuggestion | null {
	if (params.emittedEntries.length >= params.recipe.definition.output.maxItems) {
		return null;
	}

	const parsed = params.schema.safeParse(params.element);
	if (!parsed.success) return null;

	const element = normalizeStructuredPayload(parsed.data);
	const isCode = element.nodeType === 'codeNode';
	const content = isCode ? element.content.trim() : sanitizeRecipeText(element.content);
	if (!content) return null;

	const { scope } = params.recipe.definition;
	const { aliasMap, validAnchorNodeIds, focusNodeId } = params.promptContext;
	const returnedAnchorId = resolveAliasedNodeId(element.context.sourceNodeId, aliasMap);
	const anchorIsValid =
		returnedAnchorId !== null && validAnchorNodeIds.has(returnedAnchorId);
	const sourceNodeId =
		scope === 'node'
			? focusNodeId
			: anchorIsValid
				? returnedAnchorId
				: scope === 'branch'
					? focusNodeId
					: null;

	const comparisonEntry = { content, sourceNodeId };
	if (
		isDuplicateSuggestion({
			candidate: comparisonEntry,
			recentSuggestions: params.existingEntries,
			emittedSuggestions: params.emittedEntries,
		})
	) {
		return null;
	}

	const { definition } = params.recipe;
	return {
		comparisonEntry,
		suggestion: {
			id: params.createId(),
			content,
			nodeType: element.nodeType,
			nodePayload: sanitizePayload(element.nodePayload),
			confidence: element.confidence,
			position: { x: 0, y: 0 },
			context: {
				sourceNodeId,
				targetNodeId: null,
				relationshipType: element.context.relationshipType?.trim() || null,
				trigger: 'magic-wand',
				recipe: {
					id: params.recipe.id,
					title: definition.title,
					icon: definition.icon,
				},
			},
		},
	};
}

export function toRecipeChunk(params: {
	suggestion: RecipeSuggestion;
	index: number;
	nodes: AppNode[];
}) {
	const sourceDetails = getSuggestionSourceDetails(
		params.suggestion.context.sourceNodeId,
		params.nodes
	);

	return {
		type: 'data-node-suggestion' as const,
		data: {
			...params.suggestion,
			index: params.index,
			sourceNodeName: sourceDetails?.sourceNodeName,
			sourceNodeContent: sourceDetails?.sourceNodeContent,
		},
	};
}
