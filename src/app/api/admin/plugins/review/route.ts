import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createNotifications } from '@/lib/notifications/notification-service';
import { networkHostsOf } from '@/lib/plugins/manifest-schema';
import { requirePluginAdmin } from '@/lib/plugins/server/require-plugin-admin';
import type { PluginReviewDecision } from '@/types/plugin-library';
import { z } from 'zod';

const decisionSchema = z.object({
	pluginId: z.string().max(80),
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	decision: z.enum(['approve', 'changes']),
	message: z.string().trim().max(2000).optional(),
	authorHosts: z.array(z.string().max(253)).max(3).optional(),
});

/**
 * Shiko's reviewer approves a version (it's published with the exact code and fingerprint
 * that were reviewed, and owners on older versions see "Update available") or asks for
 * changes with a message. Either way the author gets a notification.
 */
export const POST = withApiValidation<
	z.infer<typeof decisionSchema>,
	{ status: 'published' | 'changes_requested' }
>(decisionSchema, async (_req, body: PluginReviewDecision, _supabase, user) => {
	const gate = await requirePluginAdmin(user);
	if ('response' in gate) return gate.response;
	const { admin } = gate;

	if (body.decision === 'changes' && !body.message) {
		return respondError('Tell the author what to change.', 400);
	}
	const { data: row, error } = await admin
		.from('plugin_versions')
		.select('status, manifest, permissions, submitted_by')
		.eq('plugin_id', body.pluginId)
		.eq('version', body.version)
		.maybeSingle();
	if (error)
		return respondError('Could not review the plugin.', 500, error.message);
	if (!row) return respondError('Not found.', 404);
	if (row.status !== 'in_review')
		return respondError('This version was already reviewed.', 409);

	// Only hosts the plugin actually reaches can be marked as the author's.
	const hosts = networkHostsOf(row.permissions as string[]);
	const authorHosts = (body.authorHosts ?? []).filter((host) =>
		hosts.includes(host)
	);
	const now = new Date().toISOString();
	const approved = body.decision === 'approve';
	const { error: updateError } = await admin
		.from('plugin_versions')
		.update({
			status: approved ? 'published' : 'changes_requested',
			reviewed_by: user.id,
			reviewed_at: now,
			review_message: body.message ?? null,
			author_hosts: approved ? authorHosts : [],
			published_at: approved ? now : null,
		})
		.eq('plugin_id', body.pluginId)
		.eq('version', body.version)
		.eq('status', 'in_review');
	if (updateError)
		return respondError(
			'Could not review the plugin.',
			500,
			updateError.message
		);

	const name =
		typeof (row.manifest as { name?: unknown }).name === 'string'
			? (row.manifest as { name: string }).name
			: body.pluginId;
	await createNotifications([
		{
			recipientUserId: row.submitted_by as string,
			actorUserId: user.id,
			eventType: 'plugin_review',
			title: approved
				? `${name} ${body.version} is published`
				: `Shiko asked for changes to ${name} ${body.version}`,
			body: approved
				? 'Map owners can turn it on from the Plugins page, and maps on an older version see “Update available”.'
				: (body.message ?? ''),
			metadata: {
				pluginId: body.pluginId,
				version: body.version,
				decision: body.decision,
			},
			dedupeKey: `plugin_review:${body.pluginId}:${body.version}`,
		},
	]);

	return respondSuccess({
		status: approved ? ('published' as const) : ('changes_requested' as const),
	});
});
