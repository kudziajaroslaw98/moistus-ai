import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const requestBodySchema = z.object({
	prompt: z.string().min(1, 'Prompt cannot be empty'),
});

const mindMapStructureSchema = z.object({
	root: z.object({
		content: z.string(),
		children: z.array(z.lazy(() => mindMapStructureSchema)).optional(),
	}),
});

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody) => {
		try {
			const { prompt } = validatedBody;

			const aiPrompt = `Generate a mind map structure in JSON format based on the following topic: "${prompt}".
    The JSON should represent a hierarchical structure with a root node and nested children.
    Each node should have a "content" field for the node text. Children should be in a "children" array.
    Example format:
    {
      "root": {
        "content": "Main Topic",
        "children": [
          {
            "content": "Subtopic 1",
            "children": [
              { "content": "Detail A" },
              { "content": "Detail B" }
            ]
          },
          { "content": "Subtopic 2" }
        ]
      }
    }
    Ensure the output is ONLY the JSON object, nothing else.`;

			const { object: aiStructure } = await generateObject({
				model: openai('gpt-4o'),
				schema: mindMapStructureSchema,
				prompt: aiPrompt,
			});

			return respondSuccess(
				{ structure: aiStructure },
				200,
				'Map structure generated successfully.'
			);
		} catch (error) {
			console.error('Error generating map structure:', error);
			return respondError(
				'Internal server error during map generation.',
				500,
				error instanceof Error ? error.message : 'Internal Server Error'
			);
		}
	}
);
