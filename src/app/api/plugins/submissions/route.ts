import { checkRateLimit, pluginSubmissionRateLimiter } from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { compareVersions, findCatalogPlugin } from '@/lib/plugins/catalog';
import { MAX_PLUGIN_CODE_BYTES } from '@/lib/plugins/limits';
import {
	describeManifestError,
	pluginManifestSchema,
} from '@/lib/plugins/manifest-schema';
import { displayNames } from '@/lib/plugins/server/plugin-library';
import type { PluginSubmissionResult } from '@/types/plugin-library';
import { createHash } from 'node:crypto';
import { z } from 'zod';

const submissionSchema = z.object({
	manifest: z.record(z.string(), z.unknown()),
	// Characters; the byte size is checked below.
	code: z.string().min(1).max(MAX_PLUGIN_CODE_BYTES),
	/** What's new in this version, shown to map owners before they update. */
	notes: z.string().trim().max(500).optional(),
	/** For the reviewer only. */
	submitterNote: z.string().trim().max(1000).optional(),
	/** "I wrote this plugin or have the right to publish it, and I'll keep it working." */
	agreed: z.literal(true),
});

/**
 * Submit a plugin version for Shiko's review. The browser sends the manifest and code
 * (it fetched them from the author's localhost; the server can't) after running the
 * automatic checks in the sandbox; Shiko's reviewer runs them again before approving.
 * Here the server checks what it can without running code: the manifest, the size, who
 * owns the id and that the version is new. The first submission claims the id.
 */
export const POST = withApiValidation<
	z.infer<typeof submissionSchema>,
	PluginSubmissionResult
>(submissionSchema, async (req, body, _supabase, user) => {
	if (user.is_anonymous) {
		return respondError('Create an account to publish plugins.', 403, 'Anonymous user');
	}
	if (!checkRateLimit(req, pluginSubmissionRateLimiter, `plugin-submit:${user.id}`).allowed) {
		return respondError('Too many submissions. Try again in an hour.', 429);
	}

	const parsed = pluginManifestSchema.safeParse(body.manifest);
	if (!parsed.success) {
		return respondError(`The manifest isn't valid: ${describeManifestError(parsed.error)}`, 400);
	}
	const manifest = parsed.data;
	if (Buffer.byteLength(body.code, 'utf8') > MAX_PLUGIN_CODE_BYTES) {
		return respondError('plugin.js is larger than 256 KB.', 400);
	}
	if (manifest.id.startsWith('shiko.') || findCatalogPlugin(manifest.id)) {
		return respondError('Ids starting with shiko. are Shiko’s. Use your own, like dev.yourname.counter.', 403);
	}

	const admin = createServiceRoleClient();
	const [{ data: plugin }, { data: versions, error: versionsError }] = await Promise.all([
		admin.from('plugins').select('id, author_id').eq('id', manifest.id).maybeSingle(),
		admin.from('plugin_versions').select('version, status').eq('plugin_id', manifest.id),
	]);
	if (versionsError) return respondError('Could not submit the plugin.', 500, versionsError.message);
	if (plugin && plugin.author_id !== user.id) {
		return respondError(
			`${manifest.id} belongs to another author. Use your own id, like dev.yourname.${manifest.nodeKinds[0].kind}.`,
			409
		);
	}

	const existing = (versions ?? []) as Array<{ version: string; status: string }>;
	const inReview = existing.find((row) => row.status === 'in_review');
	if (inReview) {
		return respondError(
			`${inReview.version} is still in review. Wait for Shiko’s answer before sending another version.`,
			409
		);
	}
	const newest = [...existing].sort((a, b) => compareVersions(b.version, a.version))[0];
	if (newest && compareVersions(manifest.version, newest.version) <= 0) {
		return respondError(`Use a version above ${newest.version} in manifest.json.`, 409);
	}
	const hasPublished = existing.some((row) => row.status === 'published');
	if (hasPublished && !body.notes) {
		return respondError('Say what’s new in this version: map owners read it before they update.', 400);
	}

	// The account's name is shown as the author, not whatever the manifest says.
	const author = (await displayNames(admin, [user.id])).get(user.id) ?? manifest.author;
	const stored = { ...manifest, author };
	const sha256 = createHash('sha256').update(body.code, 'utf8').digest('hex');

	const { error: pluginError } = plugin
		? await admin.from('plugins').update({ name: manifest.name }).eq('id', manifest.id)
		: await admin
				.from('plugins')
				.insert({ id: manifest.id, author_id: user.id, name: manifest.name });
	if (pluginError) return respondError('Could not submit the plugin.', 500, pluginError.message);

	const { error } = await admin.from('plugin_versions').insert({
		plugin_id: manifest.id,
		version: manifest.version,
		status: 'in_review',
		manifest: stored,
		code: body.code,
		code_sha256: sha256,
		permissions: manifest.permissions,
		notes: body.notes || manifest.description,
		submitter_note: body.submitterNote ?? '',
		submitted_by: user.id,
	});
	if (error) return respondError('Could not submit the plugin.', 500, error.message);

	return respondSuccess(
		{ pluginId: manifest.id, version: manifest.version, status: 'in_review' as const },
		201
	);
});
