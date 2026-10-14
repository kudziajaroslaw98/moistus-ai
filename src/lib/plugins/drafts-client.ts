import {
	DRAFT_ERROR_CODES,
	type PluginDraft,
	type PluginDraftCheckSummary,
	type PluginDraftSample,
	type PluginDraftSummary,
} from '@/types/plugin-drafts';

export const PLUGIN_DRAFTS_KEY = '/api/plugins/drafts';

/** A failed drafts API call: the server's message, its status and machine code. */
export class DraftRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string,
		/** For a revision conflict: the draft as it is now. */
		readonly draft?: PluginDraft
	) {
		super(message);
		this.name = 'DraftRequestError';
	}

	get needsDeveloperMode() {
		return this.code === DRAFT_ERROR_CODES.developerModeRequired;
	}

	get isConflict() {
		return this.code === DRAFT_ERROR_CODES.revisionConflict;
	}
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers },
	});
	const body = await response.json().catch(() => null);
	if (!response.ok) {
		throw new DraftRequestError(
			body?.error ?? 'Something went wrong. Please try again.',
			response.status,
			body?.data?.code,
			body?.data?.draft
		);
	}
	return body?.data as T;
}

/** A draft's manifest as this site serves it to its author; the developer loader reads it like a localhost one. */
/** Where a draft is edited. */
export const playgroundHref = (draftId: string) =>
	`/dashboard/plugins/playground/${draftId}`;

export const draftManifestUrl = (id: string) =>
	`${window.location.origin}${PLUGIN_DRAFTS_KEY}/${id}/files/manifest.json`;

export const listDrafts = () =>
	requestJson<PluginDraftSummary[]>(PLUGIN_DRAFTS_KEY);

export const fetchDraft = (id: string) =>
	requestJson<PluginDraft>(`${PLUGIN_DRAFTS_KEY}/${id}`);

/** A new draft from two files' text (a template or an import). */
export const createDraftFromText = (manifestText: string, code: string) =>
	requestJson<PluginDraft>(PLUGIN_DRAFTS_KEY, {
		method: 'POST',
		body: JSON.stringify({ manifestText, code }),
	});

/**
 * A draft that continues a version of a plugin you published. There is one draft per
 * plugin, so if you already have one it comes back instead, whatever it was based on
 * (see its `baseVersion`).
 */
export const createDraftFromPublished = (pluginId: string, version: string) =>
	requestJson<PluginDraft>(PLUGIN_DRAFTS_KEY, {
		method: 'POST',
		body: JSON.stringify({ from: { pluginId, version } }),
	});

export interface DraftPatch {
	manifestText?: string;
	code?: string;
	sample?: PluginDraftSample;
	checkSummary?: PluginDraftCheckSummary | null;
}

/** Saves the changed parts; fails with `isConflict` if the draft moved on since `baseRevision`. */
export const saveDraft = (
	id: string,
	baseRevision: number,
	patch: DraftPatch
) =>
	requestJson<PluginDraft>(`${PLUGIN_DRAFTS_KEY}/${id}`, {
		method: 'PATCH',
		body: JSON.stringify({ baseRevision, ...patch }),
	});

export const deleteDraft = (id: string) =>
	requestJson<{ id: string }>(`${PLUGIN_DRAFTS_KEY}/${id}`, {
		method: 'DELETE',
	});
