import {
	checkRateLimit,
	pluginDraftCreateRateLimiter,
} from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { compareVersions } from '@/lib/plugins/catalog';
import {
	draftManifestSummary,
	draftPluginId,
	nextPatchVersion,
	withManifestId,
} from '@/lib/plugins/draft-manifest';
import {
	MAX_DRAFT_MANIFEST_BYTES,
	MAX_PLUGIN_CODE_BYTES,
	MAX_PLUGIN_DRAFTS,
} from '@/lib/plugins/limits';
import {
	DRAFT_COLUMNS,
	DRAFT_SUMMARY_COLUMNS,
	draftAccessError,
	toDraft,
	toDraftSummary,
	utf8ByteLength,
	type PluginDraftRow,
} from '@/lib/plugins/server/plugin-drafts';
import {
	DRAFT_ERROR_CODES,
	type PluginDraft,
	type PluginDraftSummary,
} from '@/types/plugin-drafts';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/** The signed-in author's drafts, most recently edited first (no code or manifest text). */
export const GET = withApiValidation<unknown, PluginDraftSummary[]>(
	z.any().nullish(),
	async (_req, _body, supabase, user) => {
		const denied = await draftAccessError(supabase, user);
		if (denied) return denied;

		const { data, error } = await supabase
			.from('plugin_drafts')
			.select(DRAFT_SUMMARY_COLUMNS)
			.eq('user_id', user.id)
			.order('updated_at', { ascending: false });
		if (error) {
			return respondError('Could not load your drafts.', 500, error.message);
		}
		return respondSuccess(
			((data ?? []) as unknown as PluginDraftRow[]).map(toDraftSummary)
		);
	}
);

const createSchema = z
	.object({
		/** Start from these two files (a template or an import). */
		manifestText: z.string().max(MAX_DRAFT_MANIFEST_BYTES).optional(),
		code: z.string().max(MAX_PLUGIN_CODE_BYTES).optional(),
		/** Or start from a version of a plugin you published. */
		from: z
			.object({
				pluginId: z.string().max(80),
				version: z.string().regex(/^\d+\.\d+\.\d+$/),
			})
			.optional(),
	})
	.refine(
		(body) =>
			body.from
				? body.manifestText === undefined && body.code === undefined
				: body.manifestText !== undefined && body.code !== undefined,
		'Send manifestText and code, or from.'
	);

interface NewDraft {
	id: string;
	pluginId: string;
	manifestText: string;
	code: string;
	baseVersion: string | null;
}

async function insertDraft(
	supabase: SupabaseClient,
	user: User,
	draft: NewDraft
): Promise<Response> {
	const { count } = await supabase
		.from('plugin_drafts')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', user.id);
	if ((count ?? 0) >= MAX_PLUGIN_DRAFTS) {
		return respondError(
			`You can keep up to ${MAX_PLUGIN_DRAFTS} drafts. Delete one to start another.`,
			409,
			'Draft limit reached',
			{ code: DRAFT_ERROR_CODES.limitReached, limit: MAX_PLUGIN_DRAFTS }
		);
	}

	const summary = draftManifestSummary(draft.manifestText);
	const { data, error } = await supabase
		.from('plugin_drafts')
		.insert({
			id: draft.id,
			user_id: user.id,
			plugin_id: draft.pluginId,
			name: summary?.name ?? '',
			icon: summary?.icon ?? 'puzzle',
			description: summary?.description ?? '',
			manifest_text: draft.manifestText,
			code: draft.code,
			base_version: draft.baseVersion,
		})
		.select(DRAFT_COLUMNS)
		.single();
	if (error || !data) {
		if (error?.code === '23505') {
			return respondError('This plugin already has a draft.', 409);
		}
		return respondError('Could not create the draft.', 500, error?.message);
	}
	return respondSuccess(toDraft(data as unknown as PluginDraftRow), 201);
}

async function createFromText(
	supabase: SupabaseClient,
	user: User,
	manifestText: string,
	code: string
): Promise<Response> {
	const summary = draftManifestSummary(manifestText);
	if (!summary) return respondError('manifest.json isn’t valid JSON.', 400);
	if (utf8ByteLength(manifestText) > MAX_DRAFT_MANIFEST_BYTES) {
		return respondError('manifest.json is larger than 64 KB.', 400);
	}
	if (utf8ByteLength(code) > MAX_PLUGIN_CODE_BYTES) {
		return respondError('plugin.js is larger than 256 KB.', 400);
	}

	const id = randomUUID();
	const pluginId = draftPluginId(summary.name, id);
	// summary parsed, so the text is a JSON object and this can't be null.
	const text = withManifestId(manifestText, pluginId) as string;
	return insertDraft(supabase, user, {
		id,
		pluginId,
		manifestText: text,
		code,
		baseVersion: null,
	});
}

async function createFromPublished(
	supabase: SupabaseClient,
	user: User,
	from: { pluginId: string; version: string }
): Promise<Response> {
	// One draft per plugin: asking again opens the one you have.
	const { data: existing } = await supabase
		.from('plugin_drafts')
		.select(DRAFT_COLUMNS)
		.eq('user_id', user.id)
		.eq('plugin_id', from.pluginId)
		.maybeSingle();
	if (existing) {
		return respondSuccess(toDraft(existing as unknown as PluginDraftRow), 200);
	}

	// Published code is read with the service role (the library tables have no
	// policies); only the plugin's author can start a draft from it.
	const admin = createServiceRoleClient();
	const [{ data: plugin }, { data: versions }, { data: chosen }] =
		await Promise.all([
			admin
				.from('plugins')
				.select('author_id')
				.eq('id', from.pluginId)
				.maybeSingle(),
			admin
				.from('plugin_versions')
				.select('version')
				.eq('plugin_id', from.pluginId),
			admin
				.from('plugin_versions')
				.select('manifest, code')
				.eq('plugin_id', from.pluginId)
				.eq('version', from.version)
				.maybeSingle(),
		]);
	if (!plugin || plugin.author_id !== user.id || !chosen) {
		return respondError('Plugin not found.', 404);
	}

	// The draft starts one patch above the newest version of any status, which is
	// what the submission route will ask for.
	const newest = ((versions ?? []) as Array<{ version: string }>)
		.map((row) => row.version)
		.reduce(
			(top, version) => (compareVersions(version, top) > 0 ? version : top),
			from.version
		);
	const manifest = {
		...(chosen.manifest as Record<string, unknown>),
		id: from.pluginId,
		version: nextPatchVersion(newest),
	};
	return insertDraft(supabase, user, {
		id: randomUUID(),
		pluginId: from.pluginId,
		manifestText: JSON.stringify(manifest, null, 2),
		code: chosen.code as string,
		baseVersion: from.version,
	});
}

export const POST = withApiValidation<
	z.infer<typeof createSchema>,
	PluginDraft
>(createSchema, async (req, body, supabase, user) => {
	const denied = await draftAccessError(supabase, user);
	if (denied) return denied;
	if (
		!checkRateLimit(
			req,
			pluginDraftCreateRateLimiter,
			`plugin-draft-create:${user.id}`
		).allowed
	) {
		return respondError('Too many new drafts. Try again in an hour.', 429);
	}

	return body.from
		? createFromPublished(supabase, user, body.from)
		: createFromText(supabase, user, body.manifestText ?? '', body.code ?? '');
});
