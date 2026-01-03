import { respondError } from '@/helpers/api/responses';
import {
	checkAIFeatureAccess,
	trackAIFeatureUsage,
} from '@/helpers/api/with-ai-feature-gate';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';

const requestBodySchema = z.object({
	nodeId: z.string().uuid('Invalid node ID format'),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (_req, validatedBody, supabase, user) => {
		// Check AI feature access
		const { hasAccess, isPro, error } = await checkAIFeatureAccess(
			user,
			supabase,
			'answer'
		);

		if (!hasAccess && error) {
			return error;
		}

		try {
			const { nodeId } = validatedBody;

			const { data: questionNode, error: fetchError } = await supabase
				.from('nodes')
				.select('id, node_type, content, parent_id, map_id, metadata')
				.eq('id', nodeId)
				.single();

			if (fetchError || !questionNode) {
				console.error('Error fetching question node:', fetchError);
				return respondError(
					'Question node not found.',
					404,
					fetchError?.message
				);
			}

			if (questionNode.node_type !== 'questionNode') {
				return respondError('Node is not a question node.', 400);
			}

			if (!questionNode.content || questionNode.content.trim() === '') {
				return respondError('Question node has no content.', 400);
			}

			let contextPrompt = '';

			if (questionNode.parent_id) {
				// Fetch content of parent and its ancestors for context
				const { data: allNodesInMap, error: mapNodesError } = await supabase
					.from('nodes')
					.select('id, content, parent_id')
					.eq('map_id', questionNode.map_id);

				if (mapNodesError) {
					console.warn(
						'Could not fetch all map nodes for full context:',
						mapNodesError.message
					);
				} else {
					const nodeMap = new Map(allNodesInMap.map((n) => [n.id, n]));
					let currentParentId = questionNode.parent_id;
					const ancestorContents: string[] = [];
					let depth = 0;
					const maxDepth = 3; // Limit context depth

					while (currentParentId && depth < maxDepth) {
						const parentNode = nodeMap.get(currentParentId);

						if (parentNode && parentNode.content) {
							ancestorContents.unshift(parentNode.content); // Add to beginning to maintain order
						}

						currentParentId = parentNode?.parent_id || null;
						depth++;
					}

					if (ancestorContents.length > 0) {
						contextPrompt = `Given the following context from related ideas:\n${ancestorContents.map((c) => `- ${c}`).join('\n')}\n\n`;
					}
				}
			}

			const aiPrompt = `${contextPrompt}Please answer the following question based on your knowledge and the provided context (if any), make sure to summarize the answer in a very short paragraph. Do not include thinking in the response.:\n\nQuestion: "${questionNode.content}"\n\nAnswer:`;

			const result = streamText({
				model: openai('gpt-5-mini'),
				prompt: aiPrompt,
			});

			// Track usage for free tier users (non-blocking)
			try {
				await trackAIFeatureUsage(user, supabase, 'answer', isPro, {
					nodeId,
					questionLength: questionNode.content.length,
				});
			} catch (trackingError) {
				// Log tracking failures but don't block the response
				console.warn('Failed to track AI feature usage:', trackingError);
			}

			return result.toTextStreamResponse();
		} catch (error) {
			console.error('Error generating AI answer:', error);
			return respondError(
				'Internal server error during AI answer generation.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
