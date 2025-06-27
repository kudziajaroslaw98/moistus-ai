import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { AiMergeSuggestion } from '@/types/ai-merge-suggestion';
import { z } from 'zod';

const requestBodySchema = z.object({
	mapId: z.string().uuid('Invalid map ID format'),
});

const aiSuggestionSchema = z.object({
	node1Id: z.string(),
	node2Id: z.string(),
	reason: z.string().optional(),
});

const aiResponseSchema = z.object({
	suggestions: z.array(aiSuggestionSchema),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase) => {
		try {
			const { mapId } = validatedBody;

			const { data: nodesData, error: fetchError } = await supabase
				.from('nodes')
				.select('id, content')
				.eq('map_id', mapId);

			if (fetchError) {
				console.error('Error fetching nodes for merge suggestion:', fetchError);
				return respondError(
					'Error fetching map nodes for merge suggestion.',
					500,
					fetchError.message
				);
			}

			if (!nodesData || nodesData.length < 2) {
				console.warn(
					'Not enough nodes in map to suggest merges (minimum 2 required).'
				);
				return respondSuccess(
					{ suggestions: [] },
					200,
					'Not enough nodes in map to suggest merges (minimum 2 required).'
				);
			}

			const nodeContentList = nodesData
				.map((node) => `${node.id}: ${node.content || '[No Content]'}`)
				.join('\n');

			const aiPrompt = `Given the following list of mind map nodes (ID: Content), identify pairs of nodes that are semantically similar or cover overlapping topics and could potentially be merged.\n         Only suggest pairs where node1Id and node2Id are different.\n         Focus on semantic similarity, not just exact text matches.`;

			const { object } = await generateObject({
				model: openai('gpt-4o'),
				schema: aiResponseSchema,
				prompt: `${aiPrompt}\n\nNodes:\n${nodeContentList}`,
			});

			const validNodeIds = new Set(nodesData.map((node) => node.id));
			const processedPairs = new Set<string>();
			const validSuggestions = object.suggestions.filter((suggestion) => {
				// Validate IDs
				if (
					!validNodeIds.has(suggestion.node1Id) ||
					!validNodeIds.has(suggestion.node2Id) ||
					suggestion.node1Id === suggestion.node2Id
				) {
					return false;
				}

				// Avoid duplicate pairs (e.g., A-B and B-A)
				const pairKey = [suggestion.node1Id, suggestion.node2Id]
					.sort()
					.join('-');

				if (processedPairs.has(pairKey)) {
					return false;
				}

				processedPairs.add(pairKey);
				return true;
			});

			return respondSuccess(
				{ suggestions: validSuggestions },
				200,
				'Merge suggestions generated successfully.'
			);
		} catch (error) {
			console.error('Error during AI merge suggestion:', error);
			return respondError(
				'Internal server error during AI merge suggestion.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
