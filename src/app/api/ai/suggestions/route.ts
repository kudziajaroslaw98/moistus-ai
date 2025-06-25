import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { SuggestionContext } from '@/types/ghost-node';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Zod schema for suggestion validation
const suggestionSchema = z.object({
	suggestions: z.array(
		z.object({
			id: z.string(),
			content: z.string(),
			nodeType: z.enum([
				'defaultNode',
				'textNode',
				'imageNode',
				'resourceNode',
				'questionNode',
				'annotationNode',
				'codeNode',
				'taskNode',
				'builderNode',
			] as const),
			confidence: z.number().min(0).max(1),
			position: z.object({
				x: z.number(),
				y: z.number(),
			}),
			context: z.object({
				sourceNodeId: z.string().nullable(),
				targetNodeId: z.string().nullable(),
				relationshipType: z.string().nullable(),
				trigger: z.enum(['magic-wand', 'dangling-edge', 'auto']),
			}),
			reasoning: z.string().nullable(),
		})
	),
});

// Set maximum duration for the API route
export const maxDuration = 30;

export async function POST(request: Request) {
	try {
		const { nodes, edges, mapId, context } = await request.json();

		// Validate required fields
		if (!nodes || !Array.isArray(nodes)) {
			return Response.json({ error: 'Invalid nodes data' }, { status: 400 });
		}

		if (!context || !context.trigger) {
			return Response.json({ error: 'Invalid context data' }, { status: 400 });
		}

		// Build suggestion context
		const suggestionContext = buildSuggestionContext(nodes, edges, context);

		// Generate suggestions using AI
		const { object } = await generateObject({
			model: openai('o3-mini', {
				structuredOutputs: true,
			}),
			schema: suggestionSchema,
			// providerOptions: {
			// 	google: {
			// 		thinkingConfig: {
			// 			thinkingBudget: 1000,
			// 		},
			// 	},
			// },
			messages: [
				{
					role: 'system',
					content: SUGGESTION_PROMPT,
				},
				{
					role: 'user',
					content: `
		            Here is the current mind map context:
		            ${suggestionContext}

		            Based on this context, suggest 1-3 relevant nodes that would enhance this mind map.
		            Consider the trigger type: ${context.trigger}
		            ${context.sourceNodeId ? `Source node ID: ${context.sourceNodeId}` : ''}
		            ${context.targetNodeId ? `Target node ID: ${context.targetNodeId}` : ''}
		            ${context.relationshipType ? `Relationship type: ${context.relationshipType}` : ''}
		          `,
				},
			],
		});

		/*
		const { object } = await generateObject({
			model: google('gemini-2.5-flash'),
			schema: suggestionSchema,
			providerOptions: {
				google: {
					thinkingConfig: {
						thinkingBudget: 1000,
					},
				},
			},
			messages: [
				{
					role: 'system',
					content: SUGGESTION_PROMPT,
				},
				{
					role: 'user',
					content: `
		            Here is the current mind map context:
		            ${suggestionContext}

		            Based on this context, suggest 1-3 relevant nodes that would enhance this mind map.
		            Consider the trigger type: ${context.trigger}
		            ${context.sourceNodeId ? `Source node ID: ${context.sourceNodeId}` : ''}
		            ${context.targetNodeId ? `Target node ID: ${context.targetNodeId}` : ''}
		            ${context.relationshipType ? `Relationship type: ${context.relationshipType}` : ''}
		          `,
				},
			],
		});
	 */

		return Response.json(object);
	} catch (error) {
		console.error('Error generating suggestions:', error);

		return Response.json(
			{
				error: 'Failed to generate suggestions',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

// Context Analysis Engine
function buildSuggestionContext(
	nodes: AppNode[],
	edges: AppEdge[],
	context: SuggestionContext
): string {
	const relevantNodes = getRelevantNodes(nodes, context);
	const relevantEdges = getRelevantEdges(edges, context);

	let contextString = '';

	// Add node information
	if (relevantNodes.length > 0) {
		contextString += 'Relevant Nodes:\n';
		relevantNodes.forEach((node, index) => {
			contextString += `${index + 1}. ${node.data.content || 'Untitled'} (Type: ${node.data.node_type || 'default'})\n`;

			// Add metadata if available
			if (node.data.metadata) {
				if (node.data.metadata.title) {
					contextString += `   Title: ${node.data.metadata.title}\n`;
				}
				if (node.data.metadata.summary) {
					contextString += `   Summary: ${node.data.metadata.summary}\n`;
				}
				if (node.data.tags && node.data.tags.length > 0) {
					contextString += `   Tags: ${node.data.tags.join(', ')}\n`;
				}
			}
			contextString += '\n';
		});
	}

	// Add edge information
	if (relevantEdges.length > 0) {
		contextString += 'Relevant Connections:\n';
		relevantEdges.forEach((edge, index) => {
			const sourceNode = nodes.find((n) => n.id === edge.source);
			const targetNode = nodes.find((n) => n.id === edge.target);

			contextString += `${index + 1}. ${sourceNode?.data.content || 'Unknown'} → ${targetNode?.data.content || 'Unknown'}`;
			if (edge.data?.label) {
				contextString += ` (${edge.data.label})`;
			}
			contextString += '\n';
		});
		contextString += '\n';
	}

	// Add context-specific information
	if (context.sourceNodeId) {
		const sourceNode = nodes.find((n) => n.id === context.sourceNodeId);
		if (sourceNode) {
			contextString += `Focus Node: ${sourceNode.data.content || 'Untitled'}\n`;
			contextString += `Focus Node Type: ${sourceNode.data.node_type || 'default'}\n\n`;
		}
	}

	return contextString;
}

function getRelevantNodes(
	nodes: AppNode[],
	context: SuggestionContext
): AppNode[] {
	if (context.sourceNodeId) {
		// Get the source node and its immediate neighbors
		const sourceNode = nodes.find((n) => n.id === context.sourceNodeId);
		if (sourceNode) {
			return [
				sourceNode,
				...getConnectedNodes(nodes, context.sourceNodeId),
			].slice(0, 5);
		}
	}

	// If no specific source, return recent or important nodes
	return nodes.slice(-5); // Last 5 nodes as context
}

function getRelevantEdges(
	edges: AppEdge[],
	context: SuggestionContext
): AppEdge[] {
	if (context.sourceNodeId) {
		// Get edges connected to the source node
		return edges.filter(
			(e) =>
				e.source === context.sourceNodeId || e.target === context.sourceNodeId
		);
	}

	return edges.slice(-5); // Last 5 edges as context
}

function getConnectedNodes(nodes: AppNode[], nodeId: string): AppNode[] {
	// This would need access to edges to find connected nodes
	// For now, return empty array - this could be enhanced
	return [];
}

// Prompt Engineering
const SUGGESTION_PROMPT = `
You are an expert at expanding mind maps with relevant, insightful nodes. Your task is to suggest 1-3 new nodes that would meaningfully enhance the given mind map.

Guidelines for suggestions:
1. **Relevance**: Ensure suggestions are directly related to the existing content and context
2. **Diversity**: Suggest different types of nodes (text, questions, resources, etc.) when appropriate
3. **Depth**: Add nodes that deepen understanding or explore new angles
4. **Practical Value**: Focus on actionable, useful, or thought-provoking content
5. **Natural Flow**: Suggestions should feel like a natural extension of the current thinking

Node Type Selection:
- **textNode**: For explanatory content, definitions, or detailed information
- **questionNode**: For thought-provoking questions or areas to explore
- **resourceNode**: For external links, books, tools, or references
- **taskNode**: For actionable items or next steps
- **codeNode**: For technical examples, snippets, or implementations
- **imageNode**: When visual content would enhance understanding
- **annotationNode**: For comments, notes, or additional context
- **defaultNode**: For general concepts or simple nodes

Confidence Scoring:
- 0.8-1.0: High confidence - directly relevant and valuable
- 0.6-0.8: Medium confidence - somewhat relevant but speculative
- 0.4-0.6: Low confidence - tangentially related or experimental

Return structured JSON with suggestions array containing id, content, nodeType, confidence, position, context, and reasoning fields.
`;
