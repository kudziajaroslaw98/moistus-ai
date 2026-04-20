import {
	resolveAliasedNodeId,
	type AiIdAliasMap,
} from '@/helpers/ai-id-alias-map';
import { z } from 'zod';

const aiNodeIdSchema = z.union([z.number().int().positive(), z.string().min(1)]);

export const mergeSuggestionSchema = z.object({
	node1Id: aiNodeIdSchema.describe(
		'The ID of the first node to merge (the one that will be kept).'
	),
	node2Id: aiNodeIdSchema.describe(
		'The ID of the second node to merge (the one that will be removed).'
	),
	reason: z
		.string()
		.describe('A brief explanation for why these nodes should be merged.'),
	similarityScore: z
		.number()
		.min(0)
		.max(1)
		.describe('A score indicating how similar the nodes are.'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("A score indicating the AI's confidence in the suggestion."),
});

type MergeSuggestion = z.infer<typeof mergeSuggestionSchema>;

export type NormalizedMergeSuggestion = Omit<
	MergeSuggestion,
	'node1Id' | 'node2Id'
> & {
	node1Id: string;
	node2Id: string;
};

function buildPairKey(node1Id: string, node2Id: string) {
	return [node1Id, node2Id].sort().join('-');
}

export function processMergeSuggestionElement(params: {
	element: unknown;
	aliasMap: AiIdAliasMap;
	validNodeIds: Set<string>;
	processedPairs: Set<string>;
}): NormalizedMergeSuggestion | null {
	const parsedElement = mergeSuggestionSchema.safeParse(params.element);
	if (!parsedElement.success) {
		return null;
	}

	const resolvedNode1Id = resolveAliasedNodeId(
		parsedElement.data.node1Id,
		params.aliasMap
	);
	const resolvedNode2Id = resolveAliasedNodeId(
		parsedElement.data.node2Id,
		params.aliasMap
	);

	if (
		!resolvedNode1Id ||
		!resolvedNode2Id ||
		!params.validNodeIds.has(resolvedNode1Id) ||
		!params.validNodeIds.has(resolvedNode2Id) ||
		resolvedNode1Id === resolvedNode2Id
	) {
		return null;
	}

	const pairKey = buildPairKey(resolvedNode1Id, resolvedNode2Id);
	if (params.processedPairs.has(pairKey)) {
		return null;
	}

	params.processedPairs.add(pairKey);

	return {
		...parsedElement.data,
		node1Id: resolvedNode1Id,
		node2Id: resolvedNode2Id,
	};
}
