import { extractNodesContext } from '@/helpers/extract-node-context';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { SuggestionContext } from '@/types/ghost-node';
import { openai } from '@ai-sdk/openai';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
	UIMessage,
} from 'ai';
import { z } from 'zod';

// Zod schema for a single suggestion object from the AI
const suggestionObjectSchema = z.object({
	id: z
		.string()
		.describe(
			'A unique identifier for the suggestion, typically in UUID format.'
		),
	content: z
		.string()
		.describe('The main text content or label for the suggested node.'),
	nodeType: z
		.enum([
			'defaultNode',
			'textNode',
			'imageNode',
			'resourceNode',
			'questionNode',
			'annotationNode',
			'codeNode',
			'taskNode',
		] as const)
		.describe(
			'The type of node being suggested. Must be one of the specified values.'
		),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe(
			"A score from 0.0 to 1.0 indicating the AI's confidence in this suggestion."
		),
	position: z
		.object({
			x: z
				.number()
				.describe(
					'The suggested horizontal (x-axis) coordinate for the new node on the canvas.'
				),
			y: z
				.number()
				.describe(
					'The suggested vertical (y-axis) coordinate for the new node on the canvas.'
				),
		})
		.describe(
			'The initial x and y coordinates for placing the suggested node on the mind map canvas.'
		),
	context: z
		.object({
			sourceNodeId: z
				.string()
				.nullable()
				.describe(
					"The ID of the node that this suggestion originates from, if any. Null if it's a general map suggestion."
				),
			targetNodeId: z
				.string()
				.nullable()
				.describe(
					'The ID of a target node if the suggestion is for a connection between two nodes. Often null for new node suggestions.'
				),
			relationshipType: z
				.string()
				.nullable()
				.describe(
					"Describes the proposed relationship between the source and the new node (e.g., 'expands on', 'is an example of')."
				),
			trigger: z
				.enum(['magic-wand', 'dangling-edge', 'auto'])
				.describe(
					'The type of user action or system event that triggered this suggestion.'
				),
		})
		.describe(
			'Information about what triggered the suggestion and its relationship to existing nodes.'
		),
	reasoning: z
		.string()
		.nullable()
		.describe(
			'A brief, user-facing explanation for why this suggestion is being made.'
		),
});

// Set maximum duration for the API route
export const maxDuration = 30;

export async function POST(req: Request) {
	try {
		// Extract the body sent by the useChat hook
		const { messages }: { messages: UIMessage[] } = await req.json();

		const streamHeader = 'Generating Node Suggestions';
		const totalSteps = [
			{
				id: 'validate-request',
				name: 'Validate Request',
				status: 'pending',
			},
			{
				id: 'fetch-data',
				name: 'Fetch Data',
				status: 'pending',
			},
			{
				id: 'build-context',
				name: 'Build Context',
				status: 'pending',
			},
			{
				id: 'generate-suggestions',
				name: 'Generate Node Suggestions',
				status: 'pending',
			},
			{
				id: 'stream-results',
				name: 'Streaming Results',
				status: 'pending',
			},
		];

		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
				execute: async ({ writer }) => {
					try {
						const wait = (ms: number) =>
							new Promise((resolve) => setTimeout(resolve, ms));

						writer.write({
							type: 'start',
						});

						writer.write({
							type: 'data-stream-info',
							data: {
								steps: totalSteps,
							},
						});

						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Validating request...',
								step: 1,
								stepName: totalSteps[0].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// Safely extract request data from the last message's text part
						const lastUserMessage = messages
							.filter((m) => m.role === 'user')
							.pop();

						if (
							!lastUserMessage ||
							!lastUserMessage.parts.filter((part) => part.type === 'text')?.[0]
						) {
							throw new Error(
								'Invalid request format: User message not found.'
							);
						}

						const requestData = JSON.parse(
							lastUserMessage.parts.filter((part) => part.type === 'text')[0]
								.text
						);

						const { nodes, edges, mapId, context } = requestData;

						// Validate required fields
						if (!nodes || !Array.isArray(nodes)) {
							throw new Error('Invalid nodes data');
						}

						if (!edges || !Array.isArray(edges)) {
							throw new Error('Invalid edges data');
						}

						const mapValidation = z.string().uuid().safeParse(mapId);

						if (!mapValidation.success) {
							throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
						}

						if (!context || !context.trigger) {
							throw new Error('Invalid context data');
						}

						// --- Step 2: Fetch Data ---
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Processing mind map data...',
								step: 2,
								stepName: totalSteps[1].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// --- Step 3: Build Context ---
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Building suggestion context...',
								step: 3,
								stepName: totalSteps[2].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// Build suggestion context
						const suggestionContext = buildSuggestionContext(
							nodes,
							edges,
							context
						);

						// --- Step 4: Generate Suggestions ---
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Generating AI suggestions...',
								step: 4,
								stepName: totalSteps[3].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// Generate suggestions using AI
						const result = streamObject({
							model: openai('o4-mini'),
							output: 'array',
							schema: suggestionObjectSchema,
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

										Based on this context, suggest 1-4 relevant nodes that would enhance this mind map.
										Consider the trigger type: ${context.trigger}
										${context.sourceNodeId ? `Source node ID: ${context.sourceNodeId}` : ''}
										${context.targetNodeId ? `Target node ID: ${context.targetNodeId}` : ''}
										${context.relationshipType ? `Relationship type: ${context.relationshipType}` : ''}
									`,
								},
							],
						});

						// Stream individual suggestions
						let suggestionIndex = 0;
						let status = 'pending';

						for await (const element of result.elementStream) {
							if (status === 'pending') {
								status = 'completed';
								writer.write({
									type: 'data-stream-status',
									data: {
										header: streamHeader,
										message: 'Streaming results...',
										step: 5,
										stepName: totalSteps[4].name,
										totalSteps: totalSteps.length,
									},
								});
							}

							if (suggestionObjectSchema.safeParse(element).success) {
								writer.write({
									type: 'data-node-suggestion',
									data: {
										...element,
										index: suggestionIndex++,
									},
								});
							}
						}

						writer.write({
							type: 'data-stream-info',
							data: {
								steps: totalSteps.map((step) => ({
									...step,
									status: 'completed',
								})),
							},
						});

						writer.write({
							type: 'finish',
						});
					} catch (e) {
						const error =
							e instanceof Error ? e : new Error('An unknown error occurred.');
						console.error('Streaming process failed:', error);
						writer.write({
							type: 'data-stream-status',
							data: { header: streamHeader, error: error.message },
						});
					} finally {
						writer.write({ type: 'finish' });
					}
				},
			}),
		});
	} catch (e) {
		console.error('Error in POST handler:', e);
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
		});
	}
}

// Context Analysis Engine
function buildSuggestionContext(
	nodes: AppNode[],
	edges: AppEdge[],
	context: SuggestionContext
): string {
	const relevantNodes = getRelevantNodes(nodes, edges, context);
	const relevantEdges = getRelevantEdges(edges, context);

	let contextString = '';

	// Add node information
	if (relevantNodes.length > 0) {
		contextString += 'Relevant Nodes:\n';
		contextString += extractNodesContext(
			relevantNodes.map((node) => node.data)
		).join('; ');
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

/**
 * Identifies and returns the most relevant nodes for building suggestion context
 */
function getRelevantNodes(
	nodes: AppNode[],
	edges: AppEdge[],
	context: SuggestionContext
): AppNode[] {
	if (context.sourceNodeId) {
		// Get the source node and its immediate neighbors
		const sourceNode = nodes.find((n) => n.id === context.sourceNodeId);

		if (sourceNode) {
			return [
				sourceNode,
				...getConnectedNodes(nodes, edges, context.sourceNodeId),
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

/**
 * Finds all nodes connected to the given nodeId via edges
 */
function getConnectedNodes(
	nodes: AppNode[],
	edges: AppEdge[],
	nodeId: string
): AppNode[] {
	// Validate inputs
	if (!nodeId || !edges || !nodes) {
		return [];
	}

	// Find all edges connected to the given nodeId (both incoming and outgoing)
	const connectedEdges = edges.filter(
		(edge) => edge.source === nodeId || edge.target === nodeId
	);

	// Get the connected node IDs and deduplicate using Set
	const connectedNodeIds = new Set(
		connectedEdges.map((edge) =>
			edge.source === nodeId ? edge.target : edge.source
		)
	);

	// Filter the nodes array to get the connected nodes
	return nodes.filter((node) => connectedNodeIds.has(node.id));
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

Return structured JSON with array containing objects with id, content, nodeType, confidence, position, context, and reasoning fields.
`;
