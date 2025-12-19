import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withPublicApiValidation } from '@/helpers/api/with-public-api-validation';
import { z } from 'zod';

/**
 * GET /api/templates
 *
 * Fetches all available templates from the database.
 * Templates are system-owned maps with is_template=true.
 *
 * Query params:
 * - category: Filter by template_category (optional)
 *
 * Returns condensed template list (no nodes/edges for performance).
 */
export const GET = withPublicApiValidation(z.any().nullish(), async (req, _body, supabase) => {
	try {
		const { searchParams } = new URL(req.url);
		const category = searchParams.get('category');

		let query = supabase
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
			.eq('is_template', true)
			.order('usage_count', { ascending: false });

		if (category) {
			query = query.eq('template_category', category);
		}

		const { data: templates, error } = await query;

		if (error) {
			console.error('Error fetching templates:', error);
			return respondError('Error fetching templates.', 500, error.message);
		}

		// Transform to expected shape
		const formattedTemplates = (templates || []).map((t) => ({
			id: t.id,
			templateId: t.metadata?.templateId || t.id,
			name: t.title,
			description: t.description,
			category: t.template_category,
			icon: t.metadata?.icon || 'FileText',
			previewColors: t.metadata?.previewColors || ['#6366f1', '#8b5cf6', '#a855f7'],
			nodeCount: t.node_count || 0,
			edgeCount: t.edge_count || 0,
			usageCount: t.usage_count || 0,
		}));

		return respondSuccess({ templates: formattedTemplates }, 200, 'Templates fetched successfully.');
	} catch (error) {
		console.error('Error in GET /api/templates:', error);
		return respondError('Error fetching templates.', 500, 'Internal server error.');
	}
});
