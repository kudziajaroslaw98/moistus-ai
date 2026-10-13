import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { isUserAdmin } from '@/helpers/auth/is-admin';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { updateMapSchema } from '@/lib/validations/map-settings-schema';
import { normalizeLayoutDirection } from '@/types/layout-types';
import type { MindMapData } from '@/types/mind-map-data';
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
			.maybeSingle();

		if (!existingMap) {
			const templateResponse = await updateTemplateAsAdmin(
				mapId,
				user.id,
				validatedBody
			);
			if (templateResponse) return templateResponse;

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
		if (validatedBody.layout_direction !== undefined)
			updateData.layout_direction =
				validatedBody.layout_direction === null
					? null
					: normalizeLayoutDirection(validatedBody.layout_direction);
		// is_template and template_* fields are admin-managed — ignored for owners
		// (see updateTemplateAsAdmin)

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
			{ map: toMindMapData(updatedMap) },
			200,
			'Mind map updated successfully'
		);
	} catch (error) {
		console.error('Error in PUT /api/maps/[id]:', error);
		return respondError(
			'Error updating mind map',
			500,
			'Internal server error'
		);
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
				.maybeSingle();

			if (!existingMap) {
				const templateResponse = await deleteTemplateAsAdmin(mapId, user.id);
				if (templateResponse) return templateResponse;

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

type TemplateAdminContext = {
	serviceClient: ReturnType<typeof createServiceRoleClient>;
	template: {
		id: string;
		title: string;
	};
};

/**
 * Resolves a system template the user may manage as admin.
 * Returns null when the map is not a template or the user is not an admin,
 * so callers fall back to their normal 404.
 */
async function resolveTemplateAdminContext(
	mapId: string,
	userId: string
): Promise<TemplateAdminContext | null> {
	const serviceClient = createServiceRoleClient();

	const { data: template } = await serviceClient
		.from('mind_maps')
		.select('id, title')
		.eq('id', mapId)
		.eq('is_template', true)
		.maybeSingle();

	if (!template) return null;
	if (!(await isUserAdmin(serviceClient, userId))) return null;

	return { serviceClient, template };
}

/**
 * Builds the service-role update for an admin editing a system template.
 * Only title, description, layout direction and category are writable. Tags and
 * thumbnail are ignored (the gallery doesn't use them), and the gallery icon and
 * colors are derived from the category on read, so they are never stored or accepted.
 */
export function buildTemplateAdminUpdate(
	body: z.infer<typeof updateMapSchema>
): Record<string, unknown> {
	const updateData: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};

	if (body.title !== undefined) updateData.title = body.title;
	if (body.description !== undefined)
		updateData.description = body.description;
	if (body.layout_direction !== undefined)
		updateData.layout_direction =
			body.layout_direction === null
				? null
				: normalizeLayoutDirection(body.layout_direction);
	if (body.template_category !== undefined)
		updateData.template_category = body.template_category;

	// is_template is never writable here: templates stay templates.
	return updateData;
}

async function updateTemplateAsAdmin(
	mapId: string,
	userId: string,
	body: z.infer<typeof updateMapSchema>
): Promise<Response | null> {
	const context = await resolveTemplateAdminContext(mapId, userId);
	if (!context) return null;

	const { data: updatedMap, error } = await context.serviceClient
		.from('mind_maps')
		.update(buildTemplateAdminUpdate(body))
		.eq('id', mapId)
		.eq('is_template', true)
		.select('*')
		.single();

	if (error) {
		console.error('Error updating template:', error);
		return respondError('Error updating template', 500, error.message);
	}

	return respondSuccess(
		{ map: toMindMapData(updatedMap) },
		200,
		'Template updated successfully'
	);
}

async function deleteTemplateAsAdmin(
	mapId: string,
	userId: string
): Promise<Response | null> {
	const context = await resolveTemplateAdminContext(mapId, userId);
	if (!context) return null;

	const { serviceClient, template } = context;

	const [{ count: nodeCount }, { count: edgeCount }] = await Promise.all([
		serviceClient
			.from('nodes')
			.select('*', { count: 'exact', head: true })
			.eq('map_id', mapId),
		serviceClient
			.from('edges')
			.select('*', { count: 'exact', head: true })
			.eq('map_id', mapId),
	]);

	// CASCADE removes template nodes/edges
	const { error } = await serviceClient
		.from('mind_maps')
		.delete()
		.eq('id', mapId)
		.eq('is_template', true);

	if (error) {
		console.error('Error deleting template:', error);
		return respondError('Error deleting template', 500, error.message);
	}

	return respondSuccess(
		{
			mapId: template.id,
			title: template.title,
			deletedCounts: { nodes: nodeCount || 0, edges: edgeCount || 0 },
		},
		200,
		'Template deleted successfully'
	);
}

function toMindMapData(map: {
	id: string;
	user_id: string | null;
	title: string;
	description: string | null;
	tags: string[] | null;
	thumbnail_url: string | null;
	is_template: boolean | null;
	template_category: string | null;
	layout_direction: string | null;
	created_at: string;
	updated_at: string;
}): MindMapData {
	return {
		id: map.id,
		// System templates have no owner; MindMapData keeps the legacy string type
		user_id: map.user_id ?? '',
		title: map.title,
		description: map.description,
		tags: map.tags ?? undefined,
		thumbnailUrl: map.thumbnail_url,
		is_template: map.is_template ?? undefined,
		template_category: map.template_category,
		layout_direction: normalizeLayoutDirection(map.layout_direction),
		created_at: map.created_at,
		updated_at: map.updated_at,
	};
}
