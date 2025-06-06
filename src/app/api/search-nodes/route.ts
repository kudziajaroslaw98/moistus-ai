import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { defaultModel, parseAiJsonResponse } from '@/lib/ai/gemini';
import { z } from 'zod';

const requestBodySchema = z.object({
	mapId: z.string().uuid('Invalid map ID format'),
	query: z.string().min(1, 'Search query cannot be empty'),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase) => {
		try {
			const { mapId, query } = validatedBody;

			const { data: nodesData, error: fetchError } = await supabase
				.from('nodes')
				.select('id, content')
				.eq('map_id', mapId);

			if (fetchError) {
				console.error('Error fetching nodes for search:', fetchError);
				return respondError(
					'Error fetching map nodes for search.',
					500,
					fetchError.message
				);
			}

			if (!nodesData || nodesData.length === 0) {
				return respondSuccess(
					{ relevantNodeIds: [] },
					200,
					'No nodes found in map to search.'
				);
			}

			const nodeContentList = nodesData
				.map((node) => `${node.id}: ${node.content}`)
				.join('\n');

			const aiPrompt = `Given the following list of mind map nodes (ID: Content) and a search query, identify the IDs of the nodes that are most relevant to the query.
    Return the result as a JSON array of the relevant node IDs (strings).
    Example format: ["node-id-1", "node-id-abc", "another-id"]
    Ensure the output is ONLY the JSON array, nothing else.

    Search Query: "${query}"

    Nodes:
    ${nodeContentList}`;

			const result = await defaultModel.generateContent(aiPrompt);
			const response = result.response;
			const text = response.text();

			let relevantNodeIds: string[] = [];

			try {
				const parsed = parseAiJsonResponse<string[]>(text);

				if (
					Array.isArray(parsed) &&
					parsed.every((item) => typeof item === 'string')
				) {
					relevantNodeIds = parsed;
				} else {
					console.error(
						'AI search response is not a valid JSON array of strings:',
						text
					);
					relevantNodeIds = []; // Fallback
				}
			} catch (parseError) {
				console.error(
					'Failed to parse AI search response as JSON array:',
					parseError
				);
				console.error('AI Response Text:', text);
				relevantNodeIds = []; // Fallback
			}

			const validNodeIdsSet = new Set(nodesData.map((node) => node.id));
			const validRelevantNodeIds = relevantNodeIds.filter((id) =>
				validNodeIdsSet.has(id)
			);

			return respondSuccess(
				{ relevantNodeIds: validRelevantNodeIds },
				200,
				'Node search completed successfully.'
			);
		} catch (error) {
			console.error('Error during AI search:', error);
			return respondError(
				'Internal server error during AI search.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
