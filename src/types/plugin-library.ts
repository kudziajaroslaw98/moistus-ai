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
	/** Icon from the newest version's manifest (a `PLUGIN_ICONS` key). */
	icon: string;
	description: string;
	/** Powers of the newest version, e.g. `node:own`, `branch:read`, `network:host`. */
	permissions: string[];
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

export const PLUGIN_REPORT_REASONS = [
	'broken',
	'misleading',
	'overreach',
	'security',
	'other',
] as const;
export type PluginReportReason = (typeof PLUGIN_REPORT_REASONS)[number];

/** How each reason reads in the report dialog and the reviewer's list. */
export const PLUGIN_REPORT_REASON_LABELS: Record<PluginReportReason, string> = {
	broken: 'It doesn’t work',
	misleading: 'It shows misleading or harmful content',
	overreach: 'It asks for more than it needs',
	security: 'It looks like a security problem',
	other: 'Something else',
};

/** What `POST /api/plugins/reports` takes. */
export interface PluginReportInput {
	pluginId: string;
	version?: string;
	mapId?: string;
	reason: PluginReportReason;
	details?: string;
	/** One node's plugin data, only when the reporter chose to attach it. */
	nodeData?: Record<string, unknown>;
}

/** Open reports about one plugin version, for Shiko's reviewers. */
export interface PluginReportGroup {
	pluginId: string;
	/** Null for reports that don't name a version. */
	version: string | null;
	name: string;
	author: string;
	mapCount: number;
	/** Different people who reported it. */
	reporters: number;
	counts: Partial<Record<PluginReportReason, number>>;
	reports: Array<{
		id: string;
		reason: PluginReportReason;
		details: string;
		createdAt: string;
		nodeData: unknown;
	}>;
	/** Turned off everywhere: every version, or this one. */
	pluginDisabledReason: string | null;
	versionDisabledReason: string | null;
	/** Shiko's own plugins can only be turned off as a whole. */
	isShiko: boolean;
}

/** `POST /api/admin/plugins/moderate`. */
export type PluginModerationAction =
	| { action: 'disable'; pluginId: string; version: string | null; reason: string }
	| { action: 'enable'; pluginId: string; version: string | null }
	| { action: 'dismiss'; pluginId: string; version: string | null };
