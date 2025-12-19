import { respondError } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	checkAIFeatureAccess,
	trackAIFeatureUsage,
} from '@/helpers/api/with-ai-feature-gate';
import {
	buildContextPrompt,
	extractEnhancedContext,
} from '@/helpers/extract-enhanced-node-context';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';

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
		includeMapStructure: z.boolean().default(false),
	}),
});

// Set maximum duration for streaming
export const maxDuration = 60;

// System prompt for the AI chat
const CHAT_SYSTEM_PROMPT = `You are an intelligent AI assistant integrated into a mind mapping application. Your role is to help users:

1. **Brainstorm Ideas**: Suggest new concepts, connections, and directions for their mind maps
2. **Clarify Thinking**: Help users refine and articulate their ideas more clearly
3. **Answer Questions**: Provide information and insights relevant to their mind map topics
4. **Suggest Structure**: Recommend ways to organize and connect ideas
5. **Expand Concepts**: Offer deeper exploration of specific nodes or branches

Guidelines:
- Keep responses concise and actionable
- When suggesting nodes, be specific about content and placement
- Reference the user's existing map context when relevant
- Use markdown formatting for clarity
- Be creative but stay relevant to the user's topics
- If asked to create or modify nodes, provide clear descriptions of what to add

You have access to the user's current mind map context, which may include selected nodes and their relationships.`;

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

			if (context.mapId && context.selectedNodeIds.length > 0) {
				// Fetch selected nodes and their relationships
				const { data: nodes, error: nodesError } = await supabase
					.from('nodes')
					.select('*')
					.eq('map_id', context.mapId);

				const { data: edges, error: edgesError } = await supabase
					.from('edges')
					.select('*')
					.eq('map_id', context.mapId);

				if (!nodesError && !edgesError && nodes && edges) {
					// Build context for selected nodes
					const selectedContexts: string[] = [];

					for (const nodeId of context.selectedNodeIds) {
						try {
							const enhancedContext = extractEnhancedContext(
								nodeId,
								nodes as AppNode[],
								edges as AppEdge[],
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
						mapContextPrompt = `\n\n**Current Mind Map Context:**\n${selectedContexts.join('\n\n---\n\n')}`;
					}
				}

				// Include map structure if requested
				if (context.includeMapStructure && nodes) {
					const { data: mapData } = await supabase
						.from('mind_maps')
						.select('title, description')
						.eq('id', context.mapId)
						.single();

					if (mapData) {
						mapContextPrompt += `\n\n**Mind Map Overview:**\nTitle: ${mapData.title || 'Untitled'}\n`;
						if (mapData.description) {
							mapContextPrompt += `Description: ${mapData.description}\n`;
						}
						mapContextPrompt += `Total Nodes: ${nodes.length}\n`;
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
				model: openai('gpt-4-turbo'),
				messages: allMessages,
			});

			// Track usage for free tier users (non-blocking)
			try {
				await trackAIFeatureUsage(user, supabase, 'chat', isPro, {
					mapId: context.mapId || undefined,
					messageCount: messages.length,
					selectedNodeCount: context.selectedNodeIds.length,
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
