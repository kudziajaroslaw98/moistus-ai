/**
 * Edge fields that used to be text in the database: `animated` held 'true' / 'false' / 'null'
 * strings and the markers held a 'null' placeholder. The columns are real types now, but old
 * values still arrive from Yjs room snapshots, offline caches and history entries, so every
 * place that reads an edge goes through these. Never test them with `||` or `String(...)`.
 */

/** True only for `true`, 'true' or 't'; 'false', 'null', null and anything else are false. */
export function toEdgeAnimated(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return false;
	const normalized = value.trim().toLowerCase();
	return normalized === 'true' || normalized === 't';
}

/** A marker id, or undefined for missing, empty and 'null' placeholders. */
export function toEdgeMarker(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed : undefined;
}
