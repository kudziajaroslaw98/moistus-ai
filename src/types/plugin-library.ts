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
