import { respondError } from '@/helpers/api/responses';
import type { PluginIconKey } from '@/lib/plugins/manifest-schema';
import { isDeveloperModeOn } from '@/lib/plugins/server/developer-mode';
import {
	DRAFT_ERROR_CODES,
	type PluginDraft,
	type PluginDraftCheckSummary,
	type PluginDraftSummary,
} from '@/types/plugin-drafts';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Row of `plugin_drafts` as the API selects it (RLS keeps it to the signed-in author). */
export interface PluginDraftRow {
	id: string;
	plugin_id: string;
	name: string;
	icon: string;
	description: string;
	check_summary: PluginDraftCheckSummary | null;
	base_version: string | null;
	updated_at: string;
	manifest_text?: string;
	code?: string;
	sample?: Record<string, unknown> | null;
	revision?: number;
	created_at?: string;
}

export const DRAFT_SUMMARY_COLUMNS =
	'id, plugin_id, name, icon, description, check_summary, base_version, updated_at';
export const DRAFT_COLUMNS = `${DRAFT_SUMMARY_COLUMNS}, manifest_text, code, sample, revision, created_at`;

export function toDraftSummary(row: PluginDraftRow): PluginDraftSummary {
	return {
		id: row.id,
		pluginId: row.plugin_id,
		name: row.name,
		icon: row.icon as PluginIconKey,
		description: row.description,
		checkSummary: row.check_summary,
		baseVersion: row.base_version,
		updatedAt: row.updated_at,
	};
}

export function toDraft(row: PluginDraftRow): PluginDraft {
	return {
		...toDraftSummary(row),
		manifestText: row.manifest_text ?? '',
		code: row.code ?? '',
		sample: row.sample ?? {},
		revision: row.revision ?? 1,
		createdAt: row.created_at ?? row.updated_at,
	};
}

/**
 * The checks every drafts route starts with: a real account (not a guest) and Developer
 * mode on. Returns the error response to send, or null to carry on. The Developer mode
 * answer carries a machine code so the page can show its switch instead of an error.
 */
export async function draftAccessError(
	supabase: SupabaseClient,
	user: User
): Promise<Response | null> {
	if (user.is_anonymous) {
		return respondError(
			'Create an account to write plugins.',
			403,
			'Anonymous user'
		);
	}
	if (!(await isDeveloperModeOn(supabase, user.id))) {
		return respondError(
			'Turn on Developer mode to write plugins.',
			403,
			'Developer mode is off',
			{ code: DRAFT_ERROR_CODES.developerModeRequired }
		);
	}
	return null;
}
