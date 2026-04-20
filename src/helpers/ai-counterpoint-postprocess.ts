import {
	resolveAliasedNodeId,
	type AiIdAliasMap,
} from '@/helpers/ai-id-alias-map';
import { z } from 'zod';

const aiNodeIdSchema = z.union([z.number().int().positive(), z.string().min(1)]);

export const counterpointSuggestionSchema = z.object({
	id: z
		.string()
		.describe('A unique identifier for the suggestion, typically UUID.'),
	content: z.string().describe('Concise content of the counterpoint.'),
	nodeType: z
		.enum([
			'defaultNode',
			'textNode',
			'resourceNode',
			'annotationNode',
			'taskNode',
		] as const)
		.describe('The node type suitable for this counterpoint.'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("AI's confidence from 0.0 to 1.0."),
	position: z
		.object({ x: z.number(), y: z.number() })
		.describe('Initial canvas position (may be overridden on client).'),
	context: z
		.object({
			sourceNodeId: aiNodeIdSchema.nullable().optional(),
			targetNodeId: aiNodeIdSchema.nullable().optional(),
			relationshipType: z
				.enum([
					'contradicts',
					'risk',
					'alternative',
					'test-of',
					'mitigates',
					'questions',
				] as const)
				.nullable()
				.optional(),
			trigger: z.enum(['magic-wand', 'auto']),
			stance: z
				.enum(['counterargument', 'risk', 'alternative', 'test'])
				.nullable()
				.optional(),
			citations: z
				.array(z.object({ title: z.string(), url: z.string().url() }))
				.optional(),
		})
		.describe('Enriched context for this suggestion.'),
	reasoning: z.string().nullable().optional(),
});

type CounterpointSuggestion = z.infer<typeof counterpointSuggestionSchema>;

export type NormalizedCounterpointSuggestion = Omit<
	CounterpointSuggestion,
	'context'
> & {
	context: Omit<
		CounterpointSuggestion['context'],
		'sourceNodeId' | 'targetNodeId'
	> & {
		sourceNodeId: string | null;
		targetNodeId: string | null;
	};
};

export function normalizeCounterpointSuggestionElement(
	element: unknown,
	aliasMap: AiIdAliasMap
): NormalizedCounterpointSuggestion | null {
	const parsedElement = counterpointSuggestionSchema.safeParse(element);
	if (!parsedElement.success) {
		return null;
	}

	return {
		...parsedElement.data,
		context: {
			...parsedElement.data.context,
			sourceNodeId: resolveAliasedNodeId(
				parsedElement.data.context.sourceNodeId ?? null,
				aliasMap
			),
			targetNodeId: resolveAliasedNodeId(
				parsedElement.data.context.targetNodeId ?? null,
				aliasMap
			),
		},
	};
}
