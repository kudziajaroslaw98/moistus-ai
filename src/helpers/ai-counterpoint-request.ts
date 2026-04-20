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

	if (!Array.isArray(nodes) || !Array.isArray(edges)) {
		throw new Error('Invalid nodes or edges data.');
	}

	const mapValidation = mapIdSchema.safeParse(mapId);
	if (!mapValidation.success) {
		throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
	}

	if (!context || (context.trigger !== 'magic-wand' && context.trigger !== 'auto')) {
		throw new Error('Invalid context data');
	}

	return {
		nodes: nodes as AppNode[],
		edges: edges as AppEdge[],
		mapId: mapValidation.data,
		context: context as CounterpointRequestPayload['context'],
	};
}
