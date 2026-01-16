import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { updateMapSchema } from '@/lib/validations/map-settings-schema';
import { z } from 'zod';

/**
 * PUT /api/maps/[id] - Update mind map metadata
 *
 * Updates title, description, tags, and template settings
 * Authorization: User must own the map
 */
export const PUT = withApiValidation<
	z.infer<typeof updateMapSchema>,
	any,
	{ id: string }
>(updateMapSchema, async (req, validatedBody, supabase, user, params) => {
	try {
		const mapId = params?.id;

		if (!mapId) {
			return respondError('Map ID is required', 400, 'Missing map ID');
		}

		// Fetch the existing map to check ownership
		const { data: existingMap, error: fetchError } = await supabase
			.from('mind_maps')
			.select('id, user_id, title')
			.eq('id', mapId)
			.eq('user_id', user.id)
			.single();

		if (fetchError || !existingMap) {
			return respondError(
				'Mind map not found or unauthorized',
				404,
				fetchError?.message || 'Map not found'
			);
		}

		// Build update object (only include provided fields)
		const updateData: Record<string, any> = {
			updated_at: new Date().toISOString(),
		};

		if (validatedBody.title !== undefined)
			updateData.title = validatedBody.title;
		if (validatedBody.description !== undefined)
			updateData.description = validatedBody.description;
		if (validatedBody.tags !== undefined) updateData.tags = validatedBody.tags;
		if (validatedBody.thumbnailUrl !== undefined)
			updateData.thumbnail_url = validatedBody.thumbnailUrl;
		if (validatedBody.is_template !== undefined)
			updateData.is_template = validatedBody.is_template;
		if (validatedBody.template_category !== undefined)
			updateData.template_category = validatedBody.template_category;

		// Update the map
		const { data: updatedMap, error: updateError } = await supabase
			.from('mind_maps')
			.update(updateData)
			.eq('id', mapId)
			.eq('user_id', user.id)
			.select('*')
			.single();

		if (updateError) {
			console.error('Error updating mind map:', updateError);
			return respondError('Error updating mind map', 500, updateError.message);
		}

		return respondSuccess(
			{ map: updatedMap },
			200,
			'Mind map updated successfully'
		);
	} catch (error) {
		console.error('Error in PUT /api/maps/[id]:', error);
		return respondError('Error updating mind map', 500, 'Internal server error');
	}
});

/**
 * DELETE /api/maps/[id] - Delete a mind map
 *
 * Deletes the map and all related data (nodes, edges) via CASCADE
 * Returns counts of deleted data for UI confirmation
 * Authorization: User must own the map
 */
export const DELETE = withApiValidation<any, any, { id: string }>(
	z.object({}), // No body required for DELETE
	async (req, _validatedBody, supabase, user, params) => {
		try {
			const mapId = params?.id;

			if (!mapId) {
				return respondError('Map ID is required', 400, 'Missing map ID');
			}

			// Fetch the map to check ownership and get metadata before deletion
			const { data: existingMap, error: fetchError } = await supabase
				.from('mind_maps')
				.select('id, user_id, title')
				.eq('id', mapId)
				.eq('user_id', user.id)
				.single();

			if (fetchError || !existingMap) {
				return respondError(
					'Mind map not found or unauthorized',
					404,
					fetchError?.message || 'Map not found'
				);
			}

			// Get node and edge counts before deletion (for UI confirmation display)
			const { count: nodeCount } = await supabase
				.from('nodes')
				.select('*', { count: 'exact', head: true })
				.eq('map_id', mapId);

			const { count: edgeCount } = await supabase
				.from('edges')
				.select('*', { count: 'exact', head: true })
				.eq('map_id', mapId);

			// Delete the map (CASCADE will handle nodes/edges)
			const { error: deleteError } = await supabase
				.from('mind_maps')
				.delete()
				.eq('id', mapId);

			if (deleteError) {
				console.error('Error deleting mind map:', deleteError);

				if (deleteError.code === 'PGRST116') {
					return respondError(
						'Mind map not found or not owned by user',
						404,
						'Mind map not found'
					);
				}

				return respondError(
					'Error deleting mind map',
					500,
					deleteError.message
				);
			}

			return respondSuccess(
				{
					mapId: existingMap.id,
					title: existingMap.title,
					deletedCounts: {
						nodes: nodeCount || 0,
						edges: edgeCount || 0,
					},
				},
				200,
				'Mind map deleted successfully'
			);
		} catch (error) {
			console.error('Error in DELETE /api/maps/[id]:', error);
			return respondError(
				'Error deleting mind map',
				500,
				'Internal server error'
			);
		}
	}
);
