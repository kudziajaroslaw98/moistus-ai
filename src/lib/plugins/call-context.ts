import type { PluginBranchNode } from './branch-context';

/** What a plugin knows when it renders or runs an action. */
export interface PluginCallContext {
	canEdit: boolean;
	/** The viewer's local date, YYYY-MM-DD (for countdowns and due dates). */
	today: string;
	/** The nodes under the plugin's node; only for plugins with `branch:read`. */
	branch?: PluginBranchNode[];
}

/** The viewer's local calendar day as YYYY-MM-DD. */
export function localDateString(date: Date = new Date()): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

export function pluginCallContext(
	canEdit: boolean,
	branch?: PluginBranchNode[] | null
): PluginCallContext {
	return branch
		? { canEdit, today: localDateString(), branch }
		: { canEdit, today: localDateString() };
}
