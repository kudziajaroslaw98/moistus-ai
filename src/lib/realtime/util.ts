/**
 * Shared realtime utilities used across graph-sync, yjs-provider, and store slices.
 */

/** Returns a trimmed, non-empty string or null. */
export function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Key-order-stable JSON.stringify.
 * Ensures objects with the same keys in different insertion order produce identical strings.
 */
export function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_key, val) => {
		if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
			const sorted: Record<string, unknown> = {};
			for (const k of Object.keys(val as Record<string, unknown>).sort()) {
				sorted[k] = (val as Record<string, unknown>)[k];
			}
			return sorted;
		}
		return val;
	});
}
