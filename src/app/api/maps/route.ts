import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { checkUsageLimit } from '@/helpers/api/with-subscription-check';
import generateUuid from '@/helpers/generate-uuid';
import { z } from 'zod';

// Define schema for creating a new map
const requestBodySchema = z.object({
	title: z.string().min(1, 'Map title cannot be empty'),
	description: z.string().optional().nullable(),
	is_template: z.boolean().optional(),
	template_category: z.string().optional().nullable(),
	template_id: z.string().optional().nullable(),
});

export const GET = withApiValidation(
	z.any().nullish(),
	async (_req, _validatedBody, supabase, user) => {
		try {
			// 1. Fetch maps owned by the user (exclude templates)
			const { data: ownedMaps, error: ownedError } = await supabase
				.from('mind_maps')
				.select(
					`
					*,
					_count:nodes(count)
				`
				)
				.eq('user_id', user.id)
				.eq('is_template', false)
				.order('updated_at', { ascending: false });

			if (ownedError) {
				console.error('Error fetching owned mind maps:', ownedError);
				return respondError(
					'Error fetching mind maps.',
					500,
					ownedError.message
				);
			}

			// 2. Fetch maps the user has share access to (but doesn't own)
			// First get map IDs from share_access
			const { data: sharedAccess, error: shareError } = await supabase
				.from('share_access')
				.select('map_id')
				.eq('user_id', user.id)
				.eq('status', 'active');

			if (shareError) {
				console.error('Error fetching share access:', shareError);
				// Non-fatal: continue with owned maps only
			}

			// Get unique map IDs that user has access to but doesn't own
			const ownedMapIds = new Set((ownedMaps || []).map((m) => m.id));
			const sharedMapIds = (sharedAccess || [])
				.map((sa) => sa.map_id)
				.filter((id) => !ownedMapIds.has(id));

			let sharedMaps: typeof ownedMaps = [];

			if (sharedMapIds.length > 0) {
				// Fetch the actual map data for shared maps
				// RLS should allow access since user has share_access record
				const { data: sharedMapsData, error: sharedMapsError } = await supabase
					.from('mind_maps')
					.select(
						`
						*,
						_count:nodes(count)
					`
					)
					.in('id', sharedMapIds)
					.eq('is_template', false);

				if (sharedMapsError) {
					console.error('Error fetching shared maps:', sharedMapsError);
					// Non-fatal: continue with owned maps only
				} else {
					sharedMaps = sharedMapsData || [];
				}
			}

			// 3. Process and merge maps
			const formattedOwnedMaps = (ownedMaps || []).map((map) => ({
				...map,
				is_shared: false,
				_count: {
					nodes: map._count?.[0]?.count || 0,
					edges: 0,
				},
			}));

			const formattedSharedMaps = (sharedMaps || []).map((map) => ({
				...map,
				is_shared: true,
				_count: {
					nodes: map._count?.[0]?.count || 0,
					edges: 0,
				},
			}));

			// Combine and sort by updated_at
			const allMaps = [...formattedOwnedMaps, ...formattedSharedMaps].sort(
				(a, b) =>
					new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
			);

			return respondSuccess(
				{
					maps: allMaps,
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
			const { title, description, is_template, template_category, template_id } =
				validatedBody;

			// Check map creation limit
			const { count: currentMapsCount } = await supabase
				.from('mind_maps')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user.id);

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

			const newMapId = generateUuid();

			// Insert the new mind map into the database
			const { data: newMap, error: insertError } = await supabase
				.from('mind_maps')
				.insert([
					{
						id: newMapId,
						user_id: user.id,
						title: title,
						description: description || null,
						is_template: is_template || false,
						template_category: template_category || null,
					},
				])
				.select('*')
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
						user_id: user.id,
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
									user_id: user.id,
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

			// Delete maps owned by user
			const { error: deleteError } = await supabase
				.from('mind_maps')
				.delete()
				.in('id', mapIds)
				.eq('user_id', user.id);

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
