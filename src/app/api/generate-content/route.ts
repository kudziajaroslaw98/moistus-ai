import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';

const requestBodySchema = z.object({
	nodeId: z.string().uuid('Invalid node ID format'),
	additionalPrompt: z.string().optional(),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase) => {
		try {
			const { nodeId, additionalPrompt } = validatedBody;
			const { data: nodeData, error: fetchError } = await supabase
				.from('nodes')
				.select('content')
				.eq('id', nodeId)
				.single();

			if (fetchError || !nodeData) {
				console.error(
					'Error fetching node for content generation:',
					fetchError
				);
				const statusNumber = fetchError?.code === 'PGRST116' ? 404 : 500;
				const statusText =
					statusNumber === 404
						? 'Node not found.'
						: 'Error fetching node content.';
				return respondError(
					statusText,
					statusNumber,
					fetchError?.message || statusText
				);
			}

			const baseContent = nodeData.content;

			if (!baseContent || baseContent.trim().length === 0) {
				return respondSuccess(
					{ generatedContent: 'Node has no content to expand on.' },
					200,
					'Node has no content to expand on.'
				);
			}

			let aiPrompt = `Expand on the following topic or idea:\n\n${baseContent}`;

			if (additionalPrompt && additionalPrompt.trim().length > 0) {
				aiPrompt = `Using the following topic or idea as a base:\n\n${baseContent}\n\n${additionalPrompt.trim()}`;
			}

			const result = streamText({
				model: openai('o4-mini'),
				prompt: aiPrompt,
			});

			return result.toTextStreamResponse();
		} catch (error) {
			console.error('Error generating node content:', error);
			return respondError(
				'Internal server error during content generation.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
