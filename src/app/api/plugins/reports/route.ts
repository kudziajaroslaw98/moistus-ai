import {
	checkRateLimit,
	pluginReportRateLimiter,
} from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { findCatalogPlugin } from '@/lib/plugins/catalog';
import { PLUGIN_LIMITS } from '@/lib/plugins/manifest-schema';
import { jsonBytes } from '@/lib/plugins/ui-tree';
import { PLUGIN_REPORT_REASONS } from '@/types/plugin-library';
import { z } from 'zod';

const reportSchema = z.object({
	pluginId: z.string().max(80),
	version: z
		.string()
		.regex(/^\d+\.\d+\.\d+$/)
		.optional(),
	mapId: z.string().uuid().optional(),
	reason: z.enum(PLUGIN_REPORT_REASONS),
	details: z.string().trim().max(2000).optional(),
	nodeData: z
		.record(z.string(), z.unknown())
		.refine(
			(data) => jsonBytes(data) <= PLUGIN_LIMITS.dataBytes,
			'Node data is too large'
		)
		.optional(),
});

/**
 * Report a plugin to Shiko. Anyone signed in can (a viewer may be the first to see
 * something wrong). The author never sees who reported it or what was attached; only
 * Shiko's reviewers read reports.
 */
export const POST = withApiValidation<
	z.infer<typeof reportSchema>,
	{ id: string }
>(reportSchema, async (req, body, supabase, user) => {
	if (
		!checkRateLimit(req, pluginReportRateLimiter, `plugin-report:${user.id}`)
			.allowed
	) {
		return respondError('Too many reports. Try again in an hour.', 429);
	}
	const admin = createServiceRoleClient();
	if (!findCatalogPlugin(body.pluginId)) {
		const { data: plugin } = await admin
			.from('plugins')
			.select('id')
			.eq('id', body.pluginId)
			.maybeSingle();
		if (!plugin) return respondError('Unknown plugin.', 404);
	}
	// Keep the map only if the reporter can open it (RLS on their own session).
	let mapId: string | null = null;
	if (body.mapId) {
		const { data: map } = await supabase
			.from('mind_maps')
			.select('id')
			.eq('id', body.mapId)
			.maybeSingle();
		mapId = map?.id ?? null;
	}

	const { data, error } = await admin
		.from('plugin_reports')
		.insert({
			plugin_id: body.pluginId,
			version: body.version ?? null,
			map_id: mapId,
			reporter_id: user.id,
			reason: body.reason,
			details: body.details ?? '',
			node_data: body.nodeData ?? null,
		})
		.select('id')
		.single();
	if (error)
		return respondError('Could not send the report.', 500, error.message);
	return respondSuccess({ id: data.id as string }, 201);
});
