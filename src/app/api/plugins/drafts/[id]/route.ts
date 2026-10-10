import {
	checkRateLimit,
	pluginDraftSaveRateLimiter,
} from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	draftManifestSummary,
	manifestIdProblem,
} from '@/lib/plugins/draft-manifest';
import {
	MAX_DRAFT_MANIFEST_BYTES,
	MAX_DRAFT_SAMPLE_BYTES,
	MAX_PLUGIN_CODE_BYTES,
} from '@/lib/plugins/limits';
import {
	DRAFT_COLUMNS,
	draftAccessError,
	toDraft,
	type PluginDraftRow,
} from '@/lib/plugins/server/plugin-drafts';
import { DRAFT_ERROR_CODES, type PluginDraft } from '@/types/plugin-drafts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

type DraftParams = { id: string };

const draftIdSchema = z.string().uuid();

/** One draft, whole. Only its author can read it (RLS and the user filter). */
export const GET = withApiValidation<unknown, PluginDraft, DraftParams>(
	z.any().nullish(),
	async (_req, _body, supabase, user, params) => {
		const denied = await draftAccessError(supabase, user);
		if (denied) return denied;
		const id = draftIdSchema.safeParse(params?.id);
		if (!id.success) return respondError('Draft not found.', 404);

		const { data, error } = await supabase
			.from('plugin_drafts')
			.select(DRAFT_COLUMNS)
			.eq('id', id.data)
			.eq('user_id', user.id)
			.maybeSingle();
		if (error)
			return respondError('Could not load the draft.', 500, error.message);
		if (!data) return respondError('Draft not found.', 404);
		return respondSuccess(toDraft(data as unknown as PluginDraftRow));
	}
);

const patchSchema = z
	.object({
		/** The revision the editor loaded; the save only lands if it is still current. */
		baseRevision: z.number().int().min(1),
		manifestText: z.string().max(MAX_DRAFT_MANIFEST_BYTES).optional(),
		code: z.string().max(MAX_PLUGIN_CODE_BYTES).optional(),
		sample: z.record(z.string(), z.unknown()).optional(),
		checkSummary: z
			.object({
				passed: z.number().int().min(0).max(100),
				total: z.number().int().min(0).max(100),
			})
			.nullable()
			.optional(),
	})
	.refine(
		(body) =>
			body.manifestText !== undefined ||
			body.code !== undefined ||
			body.sample !== undefined ||
			body.checkSummary !== undefined,
		'Nothing to save.'
	);

function bytes(text: string): number {
	return Buffer.byteLength(text, 'utf8');
}

/** 409 carrying the draft as it is now, so the editor can offer to load it. */
async function conflict(
	supabase: SupabaseClient,
	userId: string,
	id: string
): Promise<Response> {
	const { data } = await supabase
		.from('plugin_drafts')
		.select(DRAFT_COLUMNS)
		.eq('id', id)
		.eq('user_id', userId)
		.maybeSingle();
	if (!data) return respondError('Draft not found.', 404);
	return respondError(
		'This draft was changed somewhere else.',
		409,
		'Draft changed',
		{
			code: DRAFT_ERROR_CODES.revisionConflict,
			draft: toDraft(data as unknown as PluginDraftRow),
		}
	);
}

export const PATCH = withApiValidation<
	z.infer<typeof patchSchema>,
	PluginDraft,
	DraftParams
>(patchSchema, async (req, body, supabase, user, params) => {
	const denied = await draftAccessError(supabase, user);
	if (denied) return denied;
	if (
		!checkRateLimit(
			req,
			pluginDraftSaveRateLimiter,
			`plugin-draft-save:${user.id}`
		).allowed
	) {
		return respondError('Saving too fast. Wait a moment.', 429);
	}
	const id = draftIdSchema.safeParse(params?.id);
	if (!id.success) return respondError('Draft not found.', 404);

	if (
		body.manifestText !== undefined &&
		bytes(body.manifestText) > MAX_DRAFT_MANIFEST_BYTES
	) {
		return respondError('manifest.json is larger than 64 KB.', 400);
	}
	if (body.code !== undefined && bytes(body.code) > MAX_PLUGIN_CODE_BYTES) {
		return respondError('plugin.js is larger than 256 KB.', 400);
	}
	if (
		body.sample !== undefined &&
		bytes(JSON.stringify(body.sample)) > MAX_DRAFT_SAMPLE_BYTES
	) {
		return respondError('The sample data is too large.', 400);
	}

	const { data: current, error: currentError } = await supabase
		.from('plugin_drafts')
		.select('plugin_id, revision')
		.eq('id', id.data)
		.eq('user_id', user.id)
		.maybeSingle();
	if (currentError) {
		return respondError('Could not save the draft.', 500, currentError.message);
	}
	if (!current) return respondError('Draft not found.', 404);
	if (current.revision !== body.baseRevision) {
		return conflict(supabase, user.id, id.data);
	}

	const update: Record<string, unknown> = {};
	if (body.manifestText !== undefined) {
		const problem = manifestIdProblem(body.manifestText, current.plugin_id);
		if (problem) return respondError(problem, 400);
		update.manifest_text = body.manifestText;
		// Cards and lists read these; half-typed JSON leaves them as they were.
		const summary = draftManifestSummary(body.manifestText);
		if (summary) {
			if (summary.name) update.name = summary.name;
			update.icon = summary.icon;
			update.description = summary.description;
		}
	}
	if (body.code !== undefined) update.code = body.code;
	if (body.sample !== undefined) update.sample = body.sample;
	if (body.checkSummary !== undefined) update.check_summary = body.checkSummary;

	const { data, error } = await supabase
		.from('plugin_drafts')
		.update(update)
		.eq('id', id.data)
		.eq('user_id', user.id)
		// Lands only if nobody saved since the check above.
		.eq('revision', body.baseRevision)
		.select(DRAFT_COLUMNS)
		.maybeSingle();
	if (error)
		return respondError('Could not save the draft.', 500, error.message);
	if (!data) return conflict(supabase, user.id, id.data);
	return respondSuccess(toDraft(data as unknown as PluginDraftRow));
});

export const DELETE = withApiValidation<
	Record<string, never>,
	{ id: string },
	DraftParams
>(z.object({}), async (_req, _body, supabase, user, params) => {
	const denied = await draftAccessError(supabase, user);
	if (denied) return denied;
	const id = draftIdSchema.safeParse(params?.id);
	if (!id.success) return respondError('Draft not found.', 404);

	const { data, error } = await supabase
		.from('plugin_drafts')
		.delete()
		.eq('id', id.data)
		.eq('user_id', user.id)
		.select('id')
		.maybeSingle();
	if (error)
		return respondError('Could not delete the draft.', 500, error.message);
	if (!data) return respondError('Draft not found.', 404);
	return respondSuccess({ id: data.id as string });
});
