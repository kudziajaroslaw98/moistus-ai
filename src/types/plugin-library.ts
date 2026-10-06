/** A version of one of your plugins, as My plugins shows it. */
export interface MyPluginVersion {
	version: string;
	status: 'in_review' | 'changes_requested' | 'published';
	notes: string;
	submittedAt: string;
	reviewedAt: string | null;
	reviewMessage: string | null;
	publishedAt: string | null;
	disabledReason: string | null;
}

/** One of your plugins in the library (`GET /api/plugins/mine`). */
export interface MyPlugin {
	id: string;
	name: string;
	/** Maps with it on. */
	mapCount: number;
	/** Reports Shiko hasn't closed yet. */
	openReports: number;
	disabledReason: string | null;
	/** Newest first. */
	versions: MyPluginVersion[];
}

/** What `POST /api/plugins/submissions` answers. */
export interface PluginSubmissionResult {
	pluginId: string;
	version: string;
	status: 'in_review';
}

/** A version waiting for review (`GET /api/admin/plugins/submissions`). */
export interface PluginSubmission {
	pluginId: string;
	version: string;
	name: string;
	author: string;
	submittedAt: string;
	/** What the author told the reviewer. */
	submitterNote: string;
	/** What's new, shown to owners before they update. */
	notes: string;
	sha256: string;
	manifest: Record<string, unknown>;
	permissions: string[];
	/** The newest published version, when this is an update. */
	previous: { version: string; permissions: string[] } | null;
	/** Maps with the plugin on (any version). */
	mapCount: number;
}

/** A reviewer's answer (`POST /api/admin/plugins/review`). */
export interface PluginReviewDecision {
	pluginId: string;
	version: string;
	decision: 'approve' | 'changes';
	/** Required when asking for changes; shown to the author. */
	message?: string;
	/** Network hosts the reviewer confirmed the author runs. */
	authorHosts?: string[];
}
