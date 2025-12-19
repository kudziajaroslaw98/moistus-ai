import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { checkUsageLimit } from '@/helpers/api/with-subscription-check';
import generateUuid from '@/helpers/generate-uuid';
import { z } from 'zod';

// Define schema for creating a new map
const requestBodySchema = z.object({
	title: z.string().min(1, 'Map title cannot be empty'),
	team_id: z.string().uuid().optional().nullable(),
	description: z.string().optional().nullable(),
	is_template: z.boolean().optional(),
	template_category: z.string().optional().nullable(),
	template_id: z.string().optional().nullable(),
});

export const GET = withApiValidation(
	z.any().nullish(),
	async (_req, _validatedBody, supabase, _user) => {
		try {
			// Build the query - exclude templates from user's map list
			const query = supabase
				.from('mind_maps')
				.select(
					`
					*,
					team:teams!team_id(
						id,
						name,
						slug
					),
					_count:nodes(count)
				`
				)
				.eq('is_template', false)
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
				team_id,
				description,
				is_template,
				template_category,
				template_id,
			} = validatedBody;

			// Check map creation limit for personal maps (not team maps)
			if (!team_id) {
				const { count: currentMapsCount } = await supabase
					.from('mind_maps')
					.select('*', { count: 'exact', head: true })
					.eq('user_id', user.id)
					.is('team_id', null); // Only count personal maps

				const { allowed, limit, remaining } = await checkUsageLimit(
					user,
					supabase,
					'mindMaps',
					currentMapsCount || 0
				);

				if (!allowed) {
					return respondError(
						`Mind map limit reached. You have ${currentMapsCount} maps (limit: ${limit}). Upgrade to Pro for unlimited maps.`,
						402,
						'LIMIT_REACHED',
						{
							currentUsage: currentMapsCount,
							limit,
							remaining: remaining,
							upgradeUrl: '/dashboard/settings/billing',
						}
					);
				}
			}

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
						is_template: is_template || false,
						template_category: template_category || null,
					},
				])
				.select(
					`
					*,
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

			// Check if a template was specified
			if (template_id) {
				// Fetch template from database
				const isUuid =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
						template_id
					);

				let templateQuery = supabase
					.from('mind_maps')
					.select('id')
					.eq('is_template', true);

				if (isUuid) {
					templateQuery = templateQuery.eq('id', template_id);
				} else {
					templateQuery = templateQuery.eq('metadata->>templateId', template_id);
				}

				const { data: templateMap } = await templateQuery.single();

				if (templateMap) {
					// Fetch template nodes
					const { data: templateNodes } = await supabase
						.from('nodes')
						.select('id, content, position_x, position_y, node_type, metadata')
						.eq('map_id', templateMap.id);

					// Fetch template edges
					const { data: templateEdges } = await supabase
						.from('edges')
						.select('id, source, target, type, metadata')
						.eq('map_id', templateMap.id);

					// Create ID mapping (old template ID -> new UUID)
					const idMap = new Map<string, string>();

					// Generate new IDs for all nodes
					(templateNodes || []).forEach((node) => {
						idMap.set(node.id, generateUuid());
					});

					// Create nodes with new IDs
					const nodesToInsert = (templateNodes || []).map((node) => ({
						id: idMap.get(node.id),
						map_id: newMap.id,
						user_id: team_id ? null : user.id,
						parent_id: null,
						content: node.content,
						position_x: node.position_x,
						position_y: node.position_y,
						node_type: node.node_type || 'defaultNode',
						metadata: node.metadata || {},
					}));

					if (nodesToInsert.length > 0) {
						const { error: nodesInsertError } = await supabase
							.from('nodes')
							.insert(nodesToInsert);

						if (nodesInsertError) {
							console.warn(
								'Warning: Failed to create template nodes:',
								nodesInsertError
							);
						}
					}

					// Create edges with mapped source/target IDs
					if (templateEdges && templateEdges.length > 0) {
						const edgesToInsert = templateEdges
							.map((edge) => {
								const newSource = idMap.get(edge.source);
								const newTarget = idMap.get(edge.target);
								// Only create edge if both source and target exist
								if (!newSource || !newTarget) return null;
								return {
									id: generateUuid(),
									map_id: newMap.id,
									user_id: team_id ? null : user.id,
									source: newSource,
									target: newTarget,
									type: edge.type || 'floatingEdge',
									metadata: edge.metadata || {},
								};
							})
							.filter(Boolean);

						if (edgesToInsert.length > 0) {
							const { error: edgesInsertError } = await supabase
								.from('edges')
								.insert(edgesToInsert);

							if (edgesInsertError) {
								console.warn(
									'Warning: Failed to create template edges:',
									edgesInsertError
								);
							}
						}
					}

					// Increment template usage count
					await supabase.rpc('increment_usage_count', {
						template_id: templateMap.id,
					});
				}
			}

			// If no template or template not found, create default root node
			if (!template_id) {
				// No template - create a default root node
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
