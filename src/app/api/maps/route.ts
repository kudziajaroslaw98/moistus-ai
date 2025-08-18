import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import generateUuid from '@/helpers/generate-uuid';
import { z } from 'zod';

// Define schema for creating a new map
const requestBodySchema = z.object({
	title: z.string().min(1, 'Map title cannot be empty'),
	folder_id: z.string().uuid().optional().nullable(),
	team_id: z.string().uuid().optional().nullable(),
	description: z.string().optional().nullable(),
	is_template: z.boolean().optional(),
	template_category: z.string().optional().nullable(),
});

export const GET = withApiValidation(
	z.any().nullish(),
	async (req, validatedBody, supabase, user) => {
		try {
			// Build the query
			const query = supabase
				.from('mind_maps')
				.select(
					`
					*,
					folder:map_folders!folder_id(
						id,
						name,
						color
					),
					team:teams!team_id(
						id,
						name,
						slug
					),
					_count:nodes(count)
				`
				)
				.order('updated_at', { ascending: false });

			const { data: maps, error: fetchError } = await query;

			if (fetchError) {
				console.error('Error fetching mind maps:', fetchError);
				return respondError(
					'Error fetching mind maps.',
					500,
					fetchError.message
				);
			}

			// Process the maps to format the count properly
			const formattedMaps =
				maps?.map((map) => ({
					...map,
					_count: {
						nodes: map._count?.[0]?.count || 0,
						edges: 0, // You can add edge counting if needed
					},
				})) || [];

			return respondSuccess(
				{
					maps: formattedMaps,
				},
				200,
				'Mind maps fetched successfully.'
			);
		} catch (error) {
			console.error('Error in GET /api/maps:', error);
			return respondError(
				'Error fetching mind maps.',
				500,
				'Internal server error.'
			);
		}
	}
);

export const POST = withApiValidation(
	requestBodySchema,
	async (req, validatedBody, supabase, user) => {
		try {
			const {
				title,
				folder_id,
				team_id,
				description,
				is_template,
				template_category,
			} = validatedBody;

			const newMapId = generateUuid();

			// If team_id is provided, verify user is a member
			if (team_id) {
				const { data: membership } = await supabase
					.from('team_members')
					.select('role')
					.eq('team_id', team_id)
					.eq('user_id', user.id)
					.single();

				if (!membership || !['owner', 'editor'].includes(membership.role)) {
					return respondError(
						'Insufficient permissions to create map in this team.',
						403,
						'You must be an owner or editor of the team.'
					);
				}
			}

			// If folder_id is provided, verify it exists and user has access
			if (folder_id) {
				const { data: folder } = await supabase
					.from('map_folders')
					.select('id, user_id, team_id')
					.eq('id', folder_id)
					.single();

				if (!folder) {
					return respondError(
						'Folder not found.',
						404,
						'The specified folder does not exist.'
					);
				}

				// Check access to folder
				const hasAccess =
					folder.user_id === user.id ||
					(folder.team_id && team_id === folder.team_id);

				if (!hasAccess) {
					return respondError(
						'Insufficient permissions for this folder.',
						403,
						'You do not have access to this folder.'
					);
				}
			}

			// Insert the new mind map into the database
			const { data: newMap, error: insertError } = await supabase
				.from('mind_maps')
				.insert([
					{
						id: newMapId,
						user_id: team_id ? null : user.id,
						team_id: team_id || null,
						title: title,
						description: description || null,
						folder_id: folder_id || null,
						is_template: is_template || false,
						template_category: template_category || null,
					},
				])
				.select(
					`
					*,
					folder:map_folders!folder_id(
						id,
						name,
						color
					),
					team:teams!team_id(
						id,
						name,
						slug
					)
				`
				)
				.single();

			if (insertError) {
				console.error('Error creating new mind map:', insertError);
				return respondError(
					'Error creating new mind map.',
					500,
					insertError.message
				);
			}

			// Create a default root node for the new map
			const defaultRootNodeId = generateUuid();
			const { error: nodeInsertError } = await supabase.from('nodes').insert([
				{
					id: defaultRootNodeId,
					map_id: newMap.id,
					parent_id: null,
					content: 'Main Topic',
					position_x: 250,
					position_y: 250,
					data: {
						node_type: 'defaultNode',
						metadata: {},
					},
				},
			]);

			if (nodeInsertError) {
				console.warn(
					'Warning: Failed to create default root node for new map:',
					nodeInsertError
				);
			}

			return respondSuccess(
				{ map: newMap },
				201,
				'Mind map created successfully.'
			);
		} catch (error) {
			console.error('Error in POST /api/maps:', error);
			return respondError(
				'Error creating mind map.',
				500,
				'Internal server error.'
			);
		}
	}
);

// Bulk operations endpoint
export const DELETE = withApiValidation(
	z.object({
		mapIds: z
			.array(z.string().uuid())
			.min(1, 'At least one map ID is required'),
	}),
	async (req, validatedBody, supabase, user) => {
		try {
			const { mapIds } = validatedBody;

			// Delete maps that belong to the user or their teams
			const { error: deleteError } = await supabase
				.from('mind_maps')
				.delete()
				.in('id', mapIds).or(`user_id.eq.${user.id},team_id.in.(
					SELECT team_id FROM team_members
					WHERE user_id = '
${user.id}'
					AND role IN ('owner', 'editor')
				)`);

			if (deleteError) {
				console.error('Error deleting maps:', deleteError);
				return respondError('Error deleting maps.', 500, deleteError.message);
			}

			return respondSuccess(
				{ deletedCount: mapIds.length },
				200,
				'Maps deleted successfully.'
			);
		} catch (error) {
			console.error('Error in DELETE /api/maps:', error);
			return respondError(
				'Error deleting maps.',
				500,
				'Internal server error.'
			);
		}
	}
);
