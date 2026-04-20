import type { UIMessage } from 'ai';
import { z } from 'zod';

export interface ConnectionRequestPayload {
	mapId: string;
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

export function parseConnectionRequestPayload(
	messages: UIMessage[]
): ConnectionRequestPayload {
	const requestData = JSON.parse(
		getLastUserText(messages)
	) as Partial<ConnectionRequestPayload>;
	const mapValidation = mapIdSchema.safeParse(requestData.mapId);

	if (!mapValidation.success) {
		throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
	}

	return {
		mapId: mapValidation.data,
	};
}
