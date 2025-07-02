import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { extractNodesContext } from '@/helpers/extract-node-context';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// 1. Zod schema for request body validation
const requestBodySchema = z.object({
	mapId: z.string().uuid('Invalid map ID format'),
});

// 2. Zod schema for validating the AI's response structure
const aiResponseSchema = z.object({
	suggestions: z.array(
		z.object({
			node1Id: z
				.string()
				.describe(
					'The ID of the first node to merge (the one that will be kept).'
				),
			node2Id: z
				.string()
				.describe(
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
		})
	),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase) => {
		try {
			const { mapId } = validatedBody;

			// 3. Fetch all nodes for the given map
			const { data: nodesData, error: fetchError } = await supabase
				.from('nodes')
				.select('*')
				.eq('map_id', mapId);

			if (fetchError) {
				console.error('Error fetching nodes for merge suggestion:', fetchError);
				return respondError(
					'Error fetching map nodes.',
					500,
					fetchError.message
				);
			}

			if (!nodesData || nodesData.length < 2) {
				return respondSuccess(
					{ suggestions: [] },
					200,
					'Not enough nodes in map to suggest merges (minimum 2 required).'
				);
			}

			// 4. Format node content for the AI prompt
			const nodeContentContext = extractNodesContext(nodesData);

			// 5. Construct the AI prompt
			const aiPrompt = `
        You are an expert at analyzing mind maps for redundancy. Your task is to identify pairs of nodes that cover overlapping topics or are semantically similar enough to be merged.

        Given the following list of mind map nodes (in 'ID: Content' format), provide suggestions for merges.

        Guidelines:
        - Focus on conceptual similarity, not just keyword matches.
        - The first node (node1Id) in a pair should be the one that is kept, and the second (node2Id) will be merged into it.
        - Provide a concise reason for each suggestion.
        - Provide a confidence score indicating the AI's confidence in the suggestion.
        - Provide a similarity score indicating the AI's confidence in the similarity between the two nodes.
        - Do not suggest merging a node with itself.
        - Ensure your response is a valid JSON object that adheres to the provided schema.

        Restrictions:
        - Do not provide connections with similarity below 0.8 ;
        - Do not provide connections with confidence below 0.8 ;

        Nodes:
        ${nodeContentContext}
      `;

			// 6. Call the AI using the Vercel AI SDK's generateObject
			const { object } = await generateObject({
				model: openai('o4-mini'),
				schema: aiResponseSchema,
				prompt: aiPrompt,
			});

			// 7. Post-process and validate AI suggestions
			const validNodeIds = new Set(nodesData.map((node) => node.id));
			const processedPairs = new Set<string>(); // To avoid duplicate suggestions (e.g., A->B and B->A)

			const validSuggestions = object.suggestions.filter((suggestion) => {
				// Validate that both node IDs exist in our database
				if (
					!validNodeIds.has(suggestion.node1Id) ||
					!validNodeIds.has(suggestion.node2Id)
				) {
					return false;
				}

				// Prevent a node from being merged with itself
				if (suggestion.node1Id === suggestion.node2Id) {
					return false;
				}

				// Create a canonical key for the pair to avoid duplicates
				const pairKey = [suggestion.node1Id, suggestion.node2Id]
					.sort()
					.join('-');

				if (processedPairs.has(pairKey)) {
					return false; // This pair has already been suggested
				}

				processedPairs.add(pairKey);
				return true;
			});

			return respondSuccess(
				{
					suggestions: validSuggestions,
					suggestionsGenerated: validSuggestions.length,
				},
				200,
				'Merge suggestions generated successfully.'
			);
		} catch (error) {
			console.error('Error during AI merge suggestion:', error);
			return respondError(
				'Internal server error during AI merge suggestion.',
				500
			);
		}
	}
);
