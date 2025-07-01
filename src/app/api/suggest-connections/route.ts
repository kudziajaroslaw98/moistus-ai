import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const requestBodySchema = z.object({
	mapId: z.string().uuid('Invalid map ID format'),
});

const aiConnectionSuggestionSchema = z.object({
	sourceNodeId: z.string(),
	targetNodeId: z.string(),
	reason: z.string().optional(),
});

const aiResponseSchema = z.object({
	suggestions: z.array(aiConnectionSuggestionSchema),
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
				console.error(
					'Error fetching nodes for connection suggestion:',
					fetchError
				);
				return respondError(
					'Error fetching map nodes for connection suggestion.',
					500,
					fetchError.message
				);
			}

			if (!nodesData || nodesData.length < 2) {
				console.warn(
					'Not enough nodes in map to suggest connections:',
					nodesData
				);
				return respondSuccess(
					{ suggestions: [] },
					200,
					'Not enough nodes in map to suggest connections (minimum 2 required).'
				);
			}

			const nodeContentList = nodesData
				.map((node) => `${node.id}: ${node.content}`)
				.join('\n');

			const aiPrompt = `Given the following list of mind map nodes (ID: Content), identify potential conceptual connections between pairs of nodes.\n    Suggest connections that represent relationships like "related to", "leads to", "is an example of", etc.\n    Only suggest connections between nodes that are NOT already directly connected (i.e., targetNodeId's parent_id is not sourceNodeId). You don't have the parent information, so focus on conceptual similarity or logical flow based on content.`;

			const { object } = await generateObject({
				model: openai('o4-mini'),
				schema: aiResponseSchema,
				prompt: `${aiPrompt}\n\nNodes:\n${nodeContentList}`,
			});

			const validNodeIds = new Set(nodesData.map((node) => node.id));
			const validSuggestions = object.suggestions.filter(
				(suggestion) =>
					validNodeIds.has(suggestion.sourceNodeId) &&
					validNodeIds.has(suggestion.targetNodeId) &&
					suggestion.sourceNodeId !== suggestion.targetNodeId
			);

			return respondSuccess(
				{ suggestions: validSuggestions },
				200,
				'Connection suggestions generated successfully.'
			);
		} catch (error) {
			console.error('Error during AI connection suggestion:', error);
			return respondError(
				'Internal server error during AI connection suggestion.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
