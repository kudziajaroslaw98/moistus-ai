import { respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { requirePluginAdmin } from '@/lib/plugins/server/require-plugin-admin';
import { z } from 'zod';

/** For the dashboard sidebar: how much is waiting for Shiko's reviewers (404 for others). */
export const GET = withApiValidation<
	unknown,
	{ submissions: number; reports: number }
>(z.any().nullish(), async (_req, _body, _supabase, user) => {
	const gate = await requirePluginAdmin(user);
	if ('response' in gate) return gate.response;
	const [submissions, reports] = await Promise.all([
		gate.admin
			.from('plugin_versions')
			.select('plugin_id', { count: 'exact', head: true })
			.eq('status', 'in_review'),
		gate.admin
			.from('plugin_reports')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'open'),
	]);
	return respondSuccess({
		submissions: submissions.count ?? 0,
		reports: reports.count ?? 0,
	});
});
