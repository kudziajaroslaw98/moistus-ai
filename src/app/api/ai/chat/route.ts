import { respondError } from '@/helpers/api/responses';
import {
	checkAIFeatureAccess,
	trackAIFeatureUsage,
} from '@/helpers/api/with-ai-feature-gate';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	buildContextPrompt,
	buildFullMapContext,
	buildMapOverviewContext,
	buildMapSummaryContext,
	extractEnhancedContext,
} from '@/helpers/extract-enhanced-node-context';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';

/**
 * Transform flat database node data to AppNode format (React Flow wrapper)
 * Required because context builders expect node.data.content, not node.content
 */
function dbNodesToAppNodes(dbNodes: NodeData[]): AppNode[] {
	return dbNodes.map((node) => ({
		id: node.id,
		type: node.node_type || 'defaultNode',
		position: { x: node.position_x, y: node.position_y },
		data: node,
	}));
}

/**
 * Transform flat database edge data to AppEdge format
 */
function dbEdgesToAppEdges(dbEdges: EdgeData[]): AppEdge[] {
	return dbEdges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: edge.type || 'default',
		data: edge,
	}));
}

// Request body schema
const chatRequestSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['user', 'assistant', 'system']),
			content: z.string(),
		})
	),
	context: z.object({
		mapId: z.string().uuid().nullable(),
		selectedNodeIds: z.array(z.string()).default([]),
		contextMode: z.enum(['minimal', 'summary', 'full']).default('summary'),
	}),
});

// Set maximum duration for streaming
export const maxDuration = 60;

// System prompt for the AI chat
const CHAT_SYSTEM_PROMPT = `You are an intelligent AI assistant integrated into a mind mapping application. Your role is to help users:

1. **Analyze & Identify Patterns**: Find themes, gaps, and connections across the mind map
2. **Brainstorm Ideas**: Suggest new concepts, connections, and directions
3. **Suggest Actions**: Recommend specific nodes to add, connections to make, or structure changes
4. **Answer Questions**: Provide insights based on the mind map content
5. **Expand Concepts**: Offer deeper exploration of specific topics

Guidelines:
- Keep responses concise and actionable
- When suggesting nodes, be specific about content and placement
- Reference the user's map context - you have access to their nodes and structure
- Use markdown formatting for clarity
- Be creative but stay relevant to the user's topics
- Identify patterns and themes when analyzing the full map

You have access to the user's mind map context including key topics, node types, structure metrics, and optionally focused nodes.`;

export const POST = withApiValidation(
	chatRequestSchema,
	async (_req, validatedBody, supabase, user) => {
		// Check AI feature access
		const { hasAccess, isPro, error } = await checkAIFeatureAccess(
			user,
			supabase,
			'chat'
		);

		if (!hasAccess && error) {
			return error;
		}

		try {
			const { messages, context } = validatedBody;

			// Build context prompt from map data if available
			let mapContextPrompt = '';

			if (context.mapId) {
				// Fetch all nodes and edges for the map
				const [nodesResult, edgesResult, mapResult] = await Promise.all([
					supabase.from('nodes').select('*').eq('map_id', context.mapId),
					supabase.from('edges').select('*').eq('map_id', context.mapId),
					supabase
						.from('mind_maps')
						.select('title, description')
						.eq('id', context.mapId)
						.single(),
				]);

				// Transform flat DB data to React Flow format (AppNode/AppEdge)
				const nodes = nodesResult.data
					? dbNodesToAppNodes(nodesResult.data as NodeData[])
					: null;
				const edges = edgesResult.data
					? dbEdgesToAppEdges(edgesResult.data as EdgeData[])
					: null;
				const mapMeta = mapResult.data || {
					title: 'Untitled',
					description: null,
				};

				if (nodes && edges) {
					// Build context based on mode
					switch (context.contextMode) {
						case 'minimal':
							mapContextPrompt = `\n\n${buildMapOverviewContext(nodes, edges, mapMeta)}`;
							break;
						case 'full':
							mapContextPrompt = `\n\n${buildFullMapContext(nodes, edges, mapMeta)}`;
							break;
						case 'summary':
						default:
							mapContextPrompt = `\n\n${buildMapSummaryContext(nodes, edges, mapMeta)}`;
							break;
					}

					// Add selected nodes context ON TOP of mode context (if any)
					if (context.selectedNodeIds.length > 0) {
						const selectedContexts: string[] = [];

						for (const nodeId of context.selectedNodeIds) {
							try {
								const enhancedContext = extractEnhancedContext(
									nodeId,
									nodes,
									edges,
									{
										includeSiblings: true,
										includeAncestry: true,
										includeTopology: false,
									}
								);
								selectedContexts.push(buildContextPrompt(enhancedContext));
							} catch {
								// Node not found or error, skip
							}
						}

						if (selectedContexts.length > 0) {
							mapContextPrompt += `\n\n**Focused Nodes (Selected):**\n${selectedContexts.join('\n\n---\n\n')}`;
						}
					}
				}
			}

			// Prepare messages with system prompt and context
			const systemMessage = {
				role: 'system' as const,
				content: CHAT_SYSTEM_PROMPT + mapContextPrompt,
			};

			// Filter out any system messages from user input and add our system message
			const userMessages = messages.filter((m) => m.role !== 'system');
			const allMessages = [systemMessage, ...userMessages];

			// Stream the response
			const result = streamText({
				model: openai('gpt-5-mini'),
				messages: allMessages,
			});

			// Track usage for free tier users (non-blocking)
			try {
				await trackAIFeatureUsage(user, supabase, 'chat', isPro, {
					mapId: context.mapId || undefined,
					messageCount: messages.length,
					selectedNodeCount: context.selectedNodeIds.length,
					contextMode: context.contextMode,
				});
			} catch (trackingError) {
				console.warn('Failed to track AI chat usage:', trackingError);
			}

			return result.toTextStreamResponse();
		} catch (error) {
			console.error('Error in AI chat:', error);
			return respondError(
				'Failed to process chat request.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
