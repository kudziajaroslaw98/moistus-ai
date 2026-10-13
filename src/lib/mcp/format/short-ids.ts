/**
 * Short ids: the shortest unique prefix (at least 6 hex chars) of each UUID
 * within a set (a map's nodes, or the caller's maps). Agents see and send
 * these instead of 36-char UUIDs. Nothing is stored: the server resolves a
 * prefix against the same set on every call.
 */

export const MIN_SHORT_ID_LENGTH = 6;

const toHex = (id: string) => id.replace(/-/g, '').toLowerCase();

function commonPrefixLength(a: string, b: string): number {
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	return i;
}

/** Maps each full id to its short id. */
export function buildShortIds(ids: Iterable<string>): Map<string, string> {
	const entries = [...new Set(ids)].map((id) => ({ id, hex: toHex(id) }));
	entries.sort((a, b) => (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));

	const shortIds = new Map<string, string>();
	entries.forEach(({ id, hex }, index) => {
		const previous = entries[index - 1]?.hex ?? '';
		const next = entries[index + 1]?.hex ?? '';
		const length = Math.max(
			MIN_SHORT_ID_LENGTH,
			commonPrefixLength(hex, previous) + 1,
			commonPrefixLength(hex, next) + 1
		);
		shortIds.set(id, hex.slice(0, length));
	});
	return shortIds;
}

export type ShortIdResolution =
	| { ok: true; id: string }
	| { ok: false; reason: 'invalid' | 'not-found' | 'ambiguous'; candidates: string[] };

/** Strips the `[...]` brackets read output puts around ids. */
export function normalizeIdInput(input: string): string {
	return input.trim().replace(/^\[(.*)\]$/, '$1').trim();
}

/** Resolves a short id, longer prefix, or full UUID against a set of ids. */
export function resolveShortId(input: string, ids: Iterable<string>): ShortIdResolution {
	const wanted = toHex(normalizeIdInput(input));
	if (!/^[0-9a-f]+$/.test(wanted) || wanted.length < MIN_SHORT_ID_LENGTH) {
		return { ok: false, reason: 'invalid', candidates: [] };
	}

	const matches = [...ids].filter((id) => toHex(id).startsWith(wanted));
	if (matches.length === 1) return { ok: true, id: matches[0] };
	return {
		ok: false,
		reason: matches.length === 0 ? 'not-found' : 'ambiguous',
		candidates: matches.slice(0, 5),
	};
}
