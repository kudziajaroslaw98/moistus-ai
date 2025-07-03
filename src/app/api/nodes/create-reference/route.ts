// src/app/api/nodes/create-reference/route.ts (Updated)

import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import generateUuid from '@/helpers/generate-uuid';
import { z } from 'zod';

const createReferenceSchema = z.object({
	sourceMapId: z.string().uuid(),
	targetMapId: z.string().uuid(),
	targetNodeId: z.string().uuid(),
	position: z.object({ x: z.number(), y: z.number() }),
});

export const POST = withApiValidation(
	createReferenceSchema,
	async (req, validatedBody, supabase, user) => {
		try {
			const { sourceMapId, targetMapId, targetNodeId, position } =
				validatedBody;

			// 1. Fetch target node to get its content snippet and map title
			const { data: targetData, error: targetError } = await supabase
				.from('nodes')
				.select('content, mind_maps(title)')
				.eq('id', targetNodeId)
				.single();

			if (targetError || !targetData) {
				return respondError(
					'Target node not found or you do not have access.',
					404
				);
			}

			const contentSnippet =
				targetData.content?.substring(0, 100) || 'Untitled Node';
			const targetMapTitle =
				(targetData.mind_maps as any)?.title || 'Another Map';

			// 2. Use the transactional function to create the node and the reference link
			const referenceNodeId = generateUuid();

			// The p_metadata now contains all the necessary info for the reference node
			const metadata = {
				targetNodeId: targetNodeId,
				targetMapId: targetMapId,
				targetMapTitle: targetMapTitle,
				contentSnippet: contentSnippet,
			};

			const { data, error } = await supabase.rpc(
				'create_node_reference_with_node',
				{
					p_source_map_id: sourceMapId,
					p_source_node_id: referenceNodeId,
					p_target_map_id: targetMapId,
					p_target_node_id: targetNodeId,
					p_user_id: user.id,
					p_node_content: `Reference: ${contentSnippet}...`, // The node's main content
					p_node_type: 'referenceNode', // **Explicitly set the node type**
					p_position_x: position.x,
					p_position_y: position.y,
					p_metadata: metadata,
				}
			);

			if (error) {
				console.error('Transaction error creating reference:', error);
				return respondError('Failed to create reference.', 500, error.message);
			}

			return respondSuccess(data, 201, 'Reference created successfully.');
		} catch (error) {
			console.error('API Error in create-reference:', error);
			return respondError(
				'An internal error occurred while creating the reference.',
				500
			);
		}
	}
);
