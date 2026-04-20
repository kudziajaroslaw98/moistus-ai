import { HYBRID_ROW_PROMPT_GUIDE } from '@/helpers/ai-hybrid-rows';
import {
	createAiIdAliasMap,
	resolveAliasedNodeIds,
} from '@/helpers/ai-id-alias-map';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	checkAIQuota,
	trackAIUsage,
} from '@/helpers/api/with-subscription-check';
import { extractNodesContext } from '@/helpers/extract-node-context';
import type { NodeData } from '@/types/node-data';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';

/** Parse AI JSON response, handling markdown code blocks */
function parseAiJsonResponse<T>(text: string): T | null {
	try {
		return JSON.parse(text) as T;
	} catch {
		try {
			const jsonString = text
				.replace(/^```json\n?/, '')
				.replace(/\n?```$/, '')
				.trim();
			return JSON.parse(jsonString) as T;
		} catch (e2) {
			console.error('Failed to parse AI response as JSON:', e2);
			return null;
		}
	}
}

const requestBodySchema = z.object({
	mapId: z.string().uuid('Invalid map ID format'),
	query: z.string().min(1, 'Search query cannot be empty'),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase, user) => {
		try {
			const { mapId, query } = validatedBody;

			// Check AI quota
			const { allowed, isPro, error } = await checkAIQuota(user, supabase);
			if (!allowed && error) return error;

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

			const aliasMap = createAiIdAliasMap(nodesData as NodeData[]);
			const nodeContentList = extractNodesContext(nodesData as NodeData[], {
				aliasMap,
			}).join('\n');

			const aiPrompt = `${HYBRID_ROW_PROMPT_GUIDE}
    Mind map nodes are provided as compact rows in the form NODE=[id,type,text,tags].
    Given the following NODE rows and a search query, identify the IDs of the nodes that are most relevant to the query.
    Return the result as a JSON array of the relevant node IDs (numbers).
    Example format: [1, 3, 8]
    Ensure the output is ONLY the JSON array, nothing else.

    Search Query: "${query}"

    NODE rows:
    ${nodeContentList}`;

			const result = await generateText({
				model: openai('gpt-5.4-nano'),
				prompt: aiPrompt,
			});
			const text = result.text;

			let relevantNodeIds: string[] = [];

			try {
				const parsed = parseAiJsonResponse<Array<string | number>>(text);

				if (
					Array.isArray(parsed) &&
					parsed.every(
						(item) => typeof item === 'number' || typeof item === 'string'
					)
				) {
					relevantNodeIds = resolveAliasedNodeIds(parsed, aliasMap);
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

			// Track usage (no-ops for Pro)
			try {
				await trackAIUsage(user, supabase, isPro);
			} catch (trackingError) {
				console.warn('Failed to track AI search usage:', trackingError);
			}

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
