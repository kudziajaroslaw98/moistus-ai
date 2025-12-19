import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withPublicApiValidation } from '@/helpers/api/with-public-api-validation';
import { z } from 'zod';

/**
 * GET /api/templates/[id]
 *
 * Fetches a single template with all its nodes and edges.
 * The ID can be either the UUID or the templateId slug.
 *
 * Returns full template data for instantiation.
 */
export const GET = withPublicApiValidation(z.any().nullish(), async (req, _body, supabase) => {
	try {
		// Extract ID from URL
		const url = new URL(req.url);
		const pathSegments = url.pathname.split('/');
		const templateId = pathSegments[pathSegments.length - 1];

		if (!templateId) {
			return respondError('Template ID is required.', 400, 'Missing template ID.');
		}

		// First, try to find by UUID
		let templateQuery = supabase
			.from('mind_maps')
			.select(
				`
				id,
				title,
				description,
				template_category,
				metadata,
				node_count,
				edge_count,
				usage_count
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
		const { data: nodes, error: nodesError } = await supabase
			.from('nodes')
			.select('id, content, position_x, position_y, node_type, metadata')
			.eq('map_id', template.id)
			.order('created_at', { ascending: true });

		if (nodesError) {
			console.error('Error fetching template nodes:', nodesError);
			return respondError('Error fetching template nodes.', 500, nodesError.message);
		}

		// Fetch edges for this template
		const { data: edges, error: edgesError } = await supabase
			.from('edges')
			.select('id, source, target, type, metadata')
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

		return respondSuccess({ template: formattedTemplate }, 200, 'Template fetched successfully.');
	} catch (error) {
		console.error('Error in GET /api/templates/[id]:', error);
		return respondError('Error fetching template.', 500, 'Internal server error.');
	}
});
