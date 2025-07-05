// src/app/api/ai/suggest-connections/route.ts

import { createClient } from '@/helpers/supabase/server';
import { openai } from '@ai-sdk/openai';
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
	UIMessage,
} from 'ai';
import { z } from 'zod';

// Zod schema for a single connection suggestion object from the AI
const connectionSuggestionSchema = z.object({
	id: z.string().describe('A unique ID for the suggestion.'),
	sourceNodeId: z
		.string()
		.describe('The ID of the source node for the connection.'),
	targetNodeId: z
		.string()
		.describe('The ID of the target node for the connection.'),
	label: z.string().nullable().describe('A concise label for the connection.'),
	reason: z
		.string()
		.describe('A brief explanation for why this connection is suggested.'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("The AI's confidence in this suggestion."),
	relationshipType: z
		.enum([
			'related-to',
			'leads-to',
			'is-example-of',
			'depends-on',
			'contradicts',
			'supports',
			'elaborates-on',
			'summarizes',
			'implements',
			'extends',
			'references',
			'causes',
			'prevents',
			'enables',
			'questions',
			'answers',
		])
		.describe('The semantic type of the relationship.'),
	metadata: z.object({
		strength: z.enum(['weak', 'moderate', 'strong']),
		bidirectional: z.boolean(),
		contextualRelevance: z.number().min(0).max(1),
	}),
});

// The entire POST function is now the API route handler
export async function POST(req: Request) {
	try {
		// Extract the body sent by the useChat hook
		const { messages }: { messages: UIMessage[] } = await req.json();
		const supabase = await createClient();
		const streamHeader = 'Suggesting Connections';
		const steps = 4;

		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				try {
					writer.write({ type: 'start' });

					writer.write({
						type: 'data-stream-status',
						data: {
							header: streamHeader,
							message: 'Validating request...',
							step: 1,
							steps,
						},
					});

					// Safely extract mapId from the last message's text part
					//
					console.dir(messages, { depth: null });

					const lastUserMessage = messages
						.filter((m) => m.role === 'user')
						.pop();

					console.dir(lastUserMessage, { depth: null });
					console.dir(lastUserMessage?.parts, { depth: null });

					if (
						!lastUserMessage ||
						!lastUserMessage.parts.filter((part) => part.type === 'text')?.[0]
					) {
						throw new Error('Invalid request format: User message not found.');
					}

					const { mapId } = JSON.parse(
						lastUserMessage.parts.filter((part) => part.type === 'text')[0].text
					);
					const mapValidation = z.string().uuid().safeParse(mapId);

					if (!mapValidation.success) {
						throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
					}

					// --- Step 2: Fetch Data ---
					writer.write({
						type: 'data-stream-status',
						data: {
							header: streamHeader,
							message: 'Fetching map data...',
							step: 2,
							steps,
						},
					});

					const { data: mapData, error } = await supabase
						.from('map_graph_aggregated_view')
						.select('nodes,edges')
						.eq('map_id', mapId)
						.single();

					if (error || mapData === null) {
						throw new Error(
							`Failed to fetch map data: ${error?.message || 'Not found'}`
						);
					}

					// --- Step 3: Prepare Context & Query AI ---
					writer.write({
						type: 'data-stream-status',
						data: {
							header: streamHeader,
							message: 'Querying AI model...',
							step: 3,
							steps,
						},
					});

					const contextPrompt = `Based on the following mind map data, suggest meaningful connections. Nodes: ${JSON.stringify(mapData.nodes)}. Edges: ${JSON.stringify(mapData.edges)}.`;
					const { partialObjectStream } = streamObject({
						model: openai('o4-mini'),
						schema: connectionSuggestionSchema,
						messages: convertToModelMessages([
							{
								role: 'system',
								parts: [{ type: 'text', text: contextPrompt }],
							},
							{
								role: 'user',
								parts: [
									{
										type: 'text',
										text: 'Please provide a list of suggested connections.',
									},
								],
							},
						]),
					});

					// --- Step 4: Stream Results ---
					writer.write({
						type: 'data-stream-status',
						data: {
							header: streamHeader,
							message: 'Streaming results...',
							step: 4,
							steps,
						},
					});

					for await (const partialObject of partialObjectStream) {
						if (partialObject) {
							writer.write({
								type: 'data-connection-suggestion',
								data: partialObject,
							});
						}
					}
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
		});

		return createUIMessageStreamResponse({ stream });
	} catch (e) {
		console.error('Error in POST handler:', e);
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
		});
	}
}
