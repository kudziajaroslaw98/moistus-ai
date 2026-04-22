import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { SuggestionContext } from '@/types/ghost-node';
import type { UIMessage } from 'ai';
import { z } from 'zod';

export interface CounterpointRequestPayload {
	nodes: AppNode[];
	edges: AppEdge[];
	mapId: string;
	context: SuggestionContext & { trigger: 'magic-wand' | 'auto' };
}

const mapIdSchema = z.string().uuid();
const counterpointNodeSchema = z
	.object({
		id: z.string().min(1),
		data: z
			.object({
				content: z.union([z.string(), z.null()]),
			})
			.passthrough(),
	})
	.passthrough();
const counterpointEdgeSchema = z
	.object({
		source: z.string().min(1),
		target: z.string().min(1),
	})
	.passthrough();
const counterpointGraphSchema = z.object({
	nodes: z.array(counterpointNodeSchema),
	edges: z.array(counterpointEdgeSchema),
});

function getLastUserText(messages: UIMessage[]) {
	const lastUserMessage = messages.filter((message) => message.role === 'user').pop();
	const textPart = lastUserMessage?.parts.find((part) => part.type === 'text');

	if (!textPart || textPart.type !== 'text') {
		throw new Error('Invalid request format: User message not found.');
	}

	return textPart.text;
}

export function parseCounterpointRequestPayload(
	messages: UIMessage[]
): CounterpointRequestPayload {
	const requestData = JSON.parse(getLastUserText(messages)) as Partial<CounterpointRequestPayload>;
	const { nodes, edges, mapId, context } = requestData;

	const graphValidation = counterpointGraphSchema.safeParse({ nodes, edges });
	if (!graphValidation.success) {
		throw new Error(`Invalid nodes or edges data: ${graphValidation.error.message}`);
	}

	const mapValidation = mapIdSchema.safeParse(mapId);
	if (!mapValidation.success) {
		throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
	}

	if (!context || (context.trigger !== 'magic-wand' && context.trigger !== 'auto')) {
		throw new Error('Invalid context data');
	}

	return {
		nodes: graphValidation.data.nodes as AppNode[],
		edges: graphValidation.data.edges as AppEdge[],
		mapId: mapValidation.data,
		context: context as CounterpointRequestPayload['context'],
	};
}
