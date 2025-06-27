import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const requestBodySchema = z.object({
	nodeId: z.string().uuid('Invalid node ID format'),
});

const conceptsSchema = z.object({
	concepts: z.array(z.string()),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase) => {
		try {
			const { nodeId } = validatedBody;

			const { data: nodeData, error: fetchError } = await supabase
				.from('nodes')
				.select('content')
				.eq('id', nodeId)
				.single();

			if (fetchError || !nodeData) {
				console.error(
					'Error fetching node for concept extraction:',
					fetchError
				);
				const statusNumber = fetchError?.code === 'PGRST116' ? 404 : 500; // PGRST116: row not found
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

			const contentToAnalyze = nodeData.content;

			if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
				return respondError(
					'Node has no content to analyze.',
					400,
					'Cannot extract concepts from empty content.'
				);
			}

			const aiPrompt = `Extract the key concepts, terms, or subtopics from the following text.`;

			const { object } = await generateObject({
				model: openai('gpt-4o'),
				schema: conceptsSchema,
				prompt: `${aiPrompt}\n\n${contentToAnalyze}`,
			});

			return respondSuccess(
				{ concepts: object.concepts },
				200,
				'Concepts extracted successfully.'
			);
		} catch (error) {
			console.error('Error extracting concepts:', error);
			return respondError(
				'Internal server error during concept extraction.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
