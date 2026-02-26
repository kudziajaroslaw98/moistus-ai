import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

/**
 * GET /api/templates/[id]
 *
 * Fetches a single template with all its nodes and edges.
 * The ID can be either the UUID or the templateId slug.
 *
 * Returns full template data for instantiation.
 */
export const GET = withAuthValidation(z.any().nullish(), async (req) => {
	try {
		const adminClient = createServiceRoleClient();

		// Extract ID from URL
		const url = new URL(req.url);
		const pathSegments = url.pathname.split('/');
		const templateId = pathSegments[pathSegments.length - 1];

		if (!templateId) {
			return respondError('Template ID is required.', 400, 'Missing template ID.');
		}

		// First, try to find by UUID
		let templateQuery = adminClient
			.from('mind_maps')
			.select(
				`
					id,
					user_id,
					title,
					description,
					tags,
					thumbnail_url,
					is_template,
					template_category,
					metadata,
					node_count,
					edge_count,
					usage_count,
					created_at,
					updated_at
				`
			)
			.eq('is_template', true);

		// Check if it's a valid UUID format
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);

		if (isUuid) {
			templateQuery = templateQuery.eq('id', templateId);
		} else {
			// Search by templateId in metadata
			templateQuery = templateQuery.eq('metadata->>templateId', templateId);
		}

		const { data: template, error: templateError } = await templateQuery.single();

		if (templateError || !template) {
			return respondError('Template not found.', 404, 'No template with this ID exists.');
		}

		// Fetch nodes for this template
		const { data: nodes, error: nodesError } = await adminClient
			.from('nodes')
			.select('*')
			.eq('map_id', template.id)
			.order('created_at', { ascending: true });

		if (nodesError) {
			console.error('Error fetching template nodes:', nodesError);
			return respondError('Error fetching template nodes.', 500, nodesError.message);
		}

		// Fetch edges for this template
		const { data: edges, error: edgesError } = await adminClient
			.from('edges')
			.select('*')
			.eq('map_id', template.id)
			.order('created_at', { ascending: true });

		if (edgesError) {
			console.error('Error fetching template edges:', edgesError);
			return respondError('Error fetching template edges.', 500, edgesError.message);
		}

		// Transform to the format expected by instantiation
		const formattedTemplate = {
			id: template.metadata?.templateId || template.id,
			dbId: template.id,
			name: template.title,
			description: template.description,
			category: template.template_category,
			icon: template.metadata?.icon || 'FileText',
			previewColors: template.metadata?.previewColors || ['#6366f1', '#8b5cf6', '#a855f7'],
			nodes: (nodes || []).map((n) => ({
				id: n.id,
				type: n.node_type || 'defaultNode',
				position: { x: n.position_x, y: n.position_y },
				data: {
					content: n.content,
					metadata: n.metadata || {},
				},
			})),
			edges: (edges || []).map((e) => ({
				id: e.id,
				source: e.source,
				target: e.target,
				type: e.type || 'floatingEdge',
				data: e.metadata || {},
			})),
		};

		const mindMapData = {
			map_id: template.id,
			user_id: template.user_id,
			title: template.title,
			description: template.description,
			tags: template.tags,
			thumbnail_url: template.thumbnail_url,
			is_template: template.is_template,
			template_category: template.template_category,
			created_at: template.created_at,
			map_updated_at: template.updated_at,
			nodes: nodes || [],
			edges: edges || [],
		};

		return respondSuccess(
			{ template: formattedTemplate, mindMapData },
			200,
			'Template fetched successfully.'
		);
	} catch (error) {
		console.error('Error in GET /api/templates/[id]:', error);
		return respondError('Error fetching template.', 500, 'Internal server error.');
	}
});
