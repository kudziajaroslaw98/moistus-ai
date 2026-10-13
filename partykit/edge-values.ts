/**
 * Copy of toEdgeAnimated in src/helpers/edge-values.ts (PartyKit can't import from src/;
 * parity test: src/lib/realtime/graph-mutation.test.ts). edges.animated used to be text,
 * so old Yjs records may still hold 'true' / 'false' / 'null' strings.
 */
export function toEdgeAnimated(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return false;
	const normalized = value.trim().toLowerCase();
	return normalized === 'true' || normalized === 't';
}
