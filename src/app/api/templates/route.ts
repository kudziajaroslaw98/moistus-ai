import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { withPublicApiValidation } from '@/helpers/api/with-public-api-validation';
import { isUserAdmin } from '@/helpers/auth/is-admin';
import generateUuid from '@/helpers/generate-uuid';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import {
	TEMPLATE_SOURCE_EDGE_COLUMNS,
	TEMPLATE_SOURCE_NODE_COLUMNS,
	buildTemplateSlug,
	cloneGraphForTemplate,
	type TemplateSourceEdgeRow,
	type TemplateSourceNodeRow,
} from '@/helpers/templates/clone-template-graph';
import {
	templateCategorySchema,
	templateIconSchema,
	templatePreviewColorsSchema,
} from '@/lib/validations/map-settings-schema';
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

const publishTemplateSchema = z.object({
	sourceMapId: z.string().uuid(),
	title: z.string().trim().min(1).max(255),
	description: z.string().trim().max(2000).nullable().optional(),
	category: templateCategorySchema,
	icon: templateIconSchema,
	previewColors: templatePreviewColorsSchema,
});

type PublishTemplateResponse = { templateId: string; slug: string };

/**
 * POST /api/templates — admin only.
 *
 * Publishes a copy of one of the admin's own maps as a new system template
 * (`is_template = true`, `user_id = NULL`). The source map is left untouched.
 * Writes use the service role because templates have no owner for RLS.
 */
export const POST = withAuthValidation<
	z.infer<typeof publishTemplateSchema>,
	PublishTemplateResponse
>(publishTemplateSchema, async (_req, body, _supabase, user) => {
	const serviceClient = createServiceRoleClient();

	if (!(await isUserAdmin(serviceClient, user.id))) {
		return respondError('Only admins can publish templates.', 403);
	}

	const { data: sourceMap, error: sourceError } = await serviceClient
		.from('mind_maps')
		.select('id')
		.eq('id', body.sourceMapId)
		.eq('user_id', user.id)
		.eq('is_template', false)
		.maybeSingle();

	if (sourceError) {
		return respondError('Error loading source map.', 500, sourceError.message);
	}
	if (!sourceMap) {
		return respondError('Source map not found.', 404);
	}

	const [nodesResult, edgesResult] = await Promise.all([
		serviceClient
			.from('nodes')
			.select(TEMPLATE_SOURCE_NODE_COLUMNS)
			.eq('map_id', sourceMap.id),
		serviceClient
			.from('edges')
			.select(TEMPLATE_SOURCE_EDGE_COLUMNS)
			.eq('map_id', sourceMap.id),
	]);

	if (nodesResult.error || edgesResult.error) {
		return respondError(
			'Error loading source map content.',
			500,
			nodesResult.error?.message ?? edgesResult.error?.message
		);
	}

	const templateId = generateUuid();
	const slug = buildTemplateSlug(body.title, templateId.slice(0, 8));
	const graph = cloneGraphForTemplate(
		(nodesResult.data ?? []) as unknown as TemplateSourceNodeRow[],
		(edgesResult.data ?? []) as unknown as TemplateSourceEdgeRow[],
		templateId,
		generateUuid
	);

	const { error: mapInsertError } = await serviceClient
		.from('mind_maps')
		.insert({
			id: templateId,
			user_id: null,
			title: body.title,
			description: body.description || null,
			is_template: true,
			template_category: body.category,
			metadata: {
				templateId: slug,
				icon: body.icon,
				previewColors: body.previewColors,
			},
			node_count: graph.nodes.length,
			edge_count: graph.edges.length,
			usage_count: 0,
		});

	if (mapInsertError) {
		return respondError('Error creating template.', 500, mapInsertError.message);
	}

	const graphError =
		(graph.nodes.length > 0
			? (await serviceClient.from('nodes').insert(graph.nodes)).error
			: null) ??
		(graph.edges.length > 0
			? (await serviceClient.from('edges').insert(graph.edges)).error
			: null);

	if (graphError) {
		// Don't leave a half-copied template in the gallery (CASCADE clears rows).
		await serviceClient.from('mind_maps').delete().eq('id', templateId);
		return respondError('Error copying map content.', 500, graphError.message);
	}

	return respondSuccess<PublishTemplateResponse>(
		{ templateId, slug },
		201,
		'Template published.'
	);
});
