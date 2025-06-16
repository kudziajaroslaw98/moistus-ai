import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { defaultModel, parseAiJsonResponse } from '@/lib/ai/gemini';
import { z } from 'zod';

const requestBodySchema = z.object({
	prompt: z.string().min(1, 'Prompt cannot be empty'),
});

// Define a simple structure type for clarity
interface MindMapStructure {
	root: {
		content: string;
		children?: MindMapStructure[];
	};
}

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

			const result = await defaultModel.generateContent(aiPrompt);
			const response = result.response;
			const text = response.text();

			let aiStructure: MindMapStructure | null;

			try {
				aiStructure = parseAiJsonResponse<MindMapStructure>(text);

				if (
					!aiStructure ||
					typeof aiStructure !== 'object' ||
					!aiStructure.root ||
					typeof aiStructure.root.content !== 'string'
				) {
					throw new Error('Parsed structure is invalid.');
				}
			} catch (parseError) {
				console.error('Failed to parse AI response as JSON:', parseError);
				console.error('AI Response Text:', text);
				return respondError(
					'Failed to parse AI response structure',
					500,
					parseError instanceof Error
						? parseError.message
						: 'AI response parsing failed.'
				);
			}

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
