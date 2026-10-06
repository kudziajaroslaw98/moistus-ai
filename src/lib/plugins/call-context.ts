/** What a plugin knows when it renders or runs an action. */
export interface PluginCallContext {
	canEdit: boolean;
	/** The viewer's local date, YYYY-MM-DD (for countdowns and due dates). */
	today: string;
}

/** The viewer's local calendar day as YYYY-MM-DD. */
export function localDateString(date: Date = new Date()): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

export function pluginCallContext(canEdit: boolean): PluginCallContext {
	return { canEdit, today: localDateString() };
}
