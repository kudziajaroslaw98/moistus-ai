import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';

// Define validation schema for the request body
const generateFromSelectedNodesSchema = z.object({
	nodeIds: z.array(z.string()).min(1, 'At least one node ID is required'),
	prompt: z.string().min(1, 'Prompt is required'),
	mapId: z.string().min(1, 'Map ID is required'),
});

export const POST = withApiValidation(
	generateFromSelectedNodesSchema,
	async (req, validatedBody, supabase, user) => {
		const { nodeIds, prompt, mapId } = validatedBody;

		// Verify the user has access to this map
		const { data: mapData, error: mapError } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.eq('user_id', user.id)
			.single();

		if (mapError || !mapData) {
			return respondError("Map not found or you don't have access to it", 404);
		}

		// Fetch the selected nodes' content
		const { data: nodesData, error: nodesError } = await supabase
			.from('nodes')
			.select('id, content, node_type, metadata')
			.in('id', nodeIds)
			.eq('map_id', mapId);

		if (nodesError || !nodesData || nodesData.length === 0) {
			return respondError('Failed to fetch node data', 500);
		}

		try {
			// Prepare data for the AI service
			const nodeContents = nodesData.map((node) => ({
				id: node.id,
				content: node.content || '',
				type: node.node_type || 'defaultNode',
				metadata: node.metadata || {},
			}));

			// Format the content for the AI
			const formattedContent = nodeContents
				.map((node, idx) => {
					const nodeType = node.type.replace('Node', '');
					return `• ${idx}-Node (${nodeType}): ${node.content}, metadata: ${JSON.stringify(node.metadata)}`;
				})
				.join('; ');

			const aiPrompt = `# Generated Content
        Based on this prompt: "${prompt}"
        Analyze ${nodeIds.length} nodes:
        ${formattedContent}
        `;

			const result = streamText({
				model: openai('gpt-4o'),
				prompt: aiPrompt,
			});

			return result.toTextStreamResponse();
		} catch (error) {
			console.error('Error generating content from nodes:', error);
			return respondError(
				error instanceof Error
					? error.message
					: 'Failed to generate content from selected nodes',
				500
			);
		}
	}
);
