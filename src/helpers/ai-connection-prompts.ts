import type { ModelMessage } from 'ai';

export function getConnectionSystemPrompt(formattedContext: string) {
	return `You are an expert at analyzing mind maps and discovering meaningful connections between concepts.

Given the following mind map content, suggest new connections that would add value.

Guidelines:
- Focus on semantic relationships, not structural ones
- Look for conceptual links: causes, dependencies, similarities, contradictions
- Avoid suggesting connections that already exist
- Each suggestion needs valid node IDs from the provided list

Restrictions:
- Only suggest connections with confidence > 0.8
- Return at most 6 suggestions, prioritized by confidence
- Quality over quantity: fewer strong suggestions beat many weak ones

Output:
- One line summary that answers:
 * What is being suggested
 * Why it matters
 * confidence or impact

${formattedContext}`;
}

export function buildConnectionModelPrompt(formattedContext: string): {
	instructions: string;
	messages: ModelMessage[];
} {
	// AI SDK 7 rejects system messages inside `messages`; system text goes in `instructions`
	return {
		instructions: getConnectionSystemPrompt(formattedContext),
		messages: [
			{
				role: 'user',
				content: 'Please suggest meaningful connections between these nodes.',
			},
		],
	};
}
