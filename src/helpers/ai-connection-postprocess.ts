import { z } from 'zod';

export const connectionSuggestionSchema = z.object({
	id: z.string().describe('A unique ID for the suggestion.'),
	sourceNodeId: z
		.string()
		.describe('The ID of the source node for the connection.'),
	targetNodeId: z
		.string()
		.describe('The ID of the target node for the connection.'),
	label: z.string().nullable().describe('A concise label for the connection.'),
	reason: z
		.string()
		.describe(
			'A brief one-sentence explanation for why this connection is suggested.'
		),
	extendedReason: z
		.string()
		.describe('An extended explanation for why this connection is suggested.'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("The AI's confidence in this suggestion."),
	relationshipType: z
		.enum([
			'related-to',
			'leads-to',
			'is-example-of',
			'depends-on',
			'contradicts',
			'supports',
			'elaborates-on',
			'summarizes',
			'implements',
			'extends',
			'references',
			'causes',
			'prevents',
			'enables',
			'questions',
			'answers',
		])
		.describe('The semantic type of the relationship.'),
	metadata: z.object({
		strength: z.enum(['weak', 'moderate', 'strong']),
		bidirectional: z.boolean(),
		contextualRelevance: z.number().min(0).max(1),
	}),
});

export type ConnectionSuggestion = z.infer<typeof connectionSuggestionSchema>;

export function normalizeConnectionSuggestionElement(
	element: unknown
): ConnectionSuggestion | null {
	const parsedElement = connectionSuggestionSchema.safeParse(element);
	return parsedElement.success ? parsedElement.data : null;
}
