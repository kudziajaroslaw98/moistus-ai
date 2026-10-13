import type { PluginIconKey } from '@/lib/plugins/manifest-schema';

/** Code tab, sample data and mock answers the preview was last using. Free-form, capped in size. */
export type PluginDraftSample = Record<string, unknown>;

/** The last automatic checks the author's browser ran on the draft (advisory, shown on cards). */
export interface PluginDraftCheckSummary {
	passed: number;
	total: number;
}

/** What a drafts list needs. */
export interface PluginDraftSummary {
	id: string;
	/** Set by Shiko when the draft is created, never edited. */
	pluginId: string;
	name: string;
	icon: PluginIconKey;
	description: string;
	checkSummary: PluginDraftCheckSummary | null;
	/** The published version this draft started from, if it did. */
	baseVersion: string | null;
	updatedAt: string;
}

export interface PluginDraft extends PluginDraftSummary {
	manifestText: string;
	code: string;
	sample: PluginDraftSample;
	/** Bumped by the database on every save; a save names the revision it started from. */
	revision: number;
	createdAt: string;
}

/** Machine codes the drafts API puts in an error's `data.code`. */
export const DRAFT_ERROR_CODES = {
	developerModeRequired: 'DEVELOPER_MODE_REQUIRED',
	limitReached: 'DRAFT_LIMIT_REACHED',
	revisionConflict: 'DRAFT_REVISION_CONFLICT',
} as const;
