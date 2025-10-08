import { respondError, respondSuccess } from '@/helpers/api/responses';
import {
    checkAIFeatureAccess,
    trackAIFeatureUsage,
} from '@/helpers/api/with-ai-feature-gate';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
// Database types - Assuming you have these generated or defined
import { z } from 'zod';

// Define types for the new node and edge based on your Supabase schema
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
			'summarize'
		);

		if (!hasAccess && error) {
			return error;
		}

		try {
			const { nodeId } = validatedBody;

			// Fetch the root node including position for placing the summary node
			const { data: rootNode, error: rootFetchError } = await supabase
				.from('nodes')
				.select('map_id, position_x, position_y')
				.eq('id', nodeId)
				.single();

			if (rootFetchError || !rootNode) {
				console.error('Error fetching root node data:', rootFetchError);
				const statusNumber = rootFetchError?.code === 'PGRST116' ? 404 : 500;
				const statusText =
					statusNumber === 404
						? 'Branch root node not found.'
						: 'Error fetching branch root node.';

				return respondError(
					statusText,
					statusNumber,
					rootFetchError?.message || statusText
				);
			}

			// Fetch all nodes for the specific map
			const { data: allNodesData, error: fetchError } = await supabase
				.from('nodes')
				.select(
					'id, parent_id, content, node_type, map_id, sourceUrl, metadata'
				) // Select node_type
				.eq('map_id', rootNode.map_id);

			if (fetchError) {
				console.error(
					'Error fetching nodes for branch summarization:',
					fetchError
				);
				return respondError(
					'Error fetching map nodes for summarization.',
					500,
					fetchError.message
				);
			}

			if (!allNodesData) {
				return respondError(
					'Could not retrieve nodes for the map.',
					500,
					'Failed to retrieve map nodes.'
				);
			}

			const branchRootNodeData = allNodesData.find(
				(node) => node.id === nodeId
			);

			if (!branchRootNodeData) {
				return respondError(
					'Branch root node not found in map data.',
					404,
					'Branch root node not found in map data.'
				);
			}

			// Build branch content string recursively, including relevant metadata
			const nodeMap = new Map(allNodesData.map((node) => [node.id, node]));
			const childrenMap = new Map<string, typeof allNodesData>();
			allNodesData.forEach((node) => {
				if (node.parent_id) {
					if (!childrenMap.has(node.parent_id)) {
						childrenMap.set(node.parent_id, []);
					}

					childrenMap.get(node.parent_id)?.push(node);
				}
			});

			const buildContentString = (
				currentNodeId: string,
				depth: number
			): string => {
				const node = nodeMap.get(currentNodeId);
				if (!node) return '';

				let nodeInfo = `${'  '.repeat(depth)}Node (ID: ${node.id}, Type: ${node.node_type || 'default'}): ${node.content || '[No Content]'}`;

				// Append relevant metadata and source_url
				const details = [];
				if (node.sourceUrl) details.push(`Source: ${node.sourceUrl}`);

				if (node.metadata) {
					if (node.metadata.isComplete !== undefined)
						details.push(`Completed: ${node.metadata.isComplete}`);
					if (node.metadata.dueDate)
						details.push(`Due: ${node.metadata.dueDate}`);
					if (node.metadata.priority)
						details.push(`Priority: ${node.metadata.priority}`);
					if (node.metadata.imageUrl)
						details.push(`Image: ${node.metadata.imageUrl}`);
					if (node.metadata.summary)
						details.push(`Resource Summary: ${node.metadata.summary}`);
					if (node.metadata.answer)
						details.push(`Answer: ${node.metadata.answer}`);
					if (node.metadata.annotationType)
						details.push(`Annotation Type: ${node.metadata.annotationType}`);
				}

				if (details.length > 0) {
					nodeInfo += ` [${details.join('; ')}]`;
				}

				nodeInfo += '\n';

				const children = childrenMap.get(currentNodeId) || [];

				for (const child of children) {
					nodeInfo += buildContentString(child.id, depth + 1);
				}

				return nodeInfo;
			};

			const branchContent = buildContentString(nodeId, 0);

			if (!branchContent.trim()) {
				return respondSuccess({ summaryNode: null, summaryEdge: null }, 200);
			}

			const aiPrompt = `Summarize the following content from a mind map branch, represented hierarchically. Include key details from metadata like source URLs, completion status, image presence, etc., where relevant. Focus on the main ideas and relationships. Output only the summary text.\n\nBranch Content:\n${branchContent}`;

			const result = streamText({
				model: openai('o4-mini'),
				prompt: aiPrompt,
			});

			// Track usage for free tier users
			// Count all nodes in the branch (root + descendants)
			const countDescendants = (currentNodeId: string): number => {
				let count = 1; // Current node
				const children = childrenMap.get(currentNodeId) || [];

				for (const child of children) {
					count += countDescendants(child.id);
				}

				return count;
			};

			await trackAIFeatureUsage(user, supabase, 'summarize', isPro, {
				nodeId,
				nodeCount: countDescendants(nodeId),
			});

			return result.toTextStreamResponse();
		} catch (error) {
			console.error('Error during AI branch summarization:', error);
			return respondError(
				'Internal server error during AI branch summarization.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
