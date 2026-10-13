/** Small stable string hash (non-negative 32-bit). */
export function hashString(value: string): number {
	let hash = 0;

	for (let i = 0; i < value.length; i++) {
		hash = (hash << 5) - hash + value.charCodeAt(i);
		hash |= 0;
	}

	return Math.abs(hash);
}

/** Accent hues for covers: blue, violet, teal, rose, amber, green. */
export const COVER_HUES = [212, 252, 172, 334, 18, 146] as const;

export interface MapCoverSpec {
	/** Map's first letter, shown large and echoed. */
	letter: string;
	hue: number;
}

/** What a map's cover shows: its first letter in a hue picked from its id. */
export function getMapCoverSpec(seed: string, title: string): MapCoverSpec {
	// Array.from keeps surrogate pairs (emoji) whole.
	const [first] = Array.from(title.trim());

	return {
		letter: first ? first.toLocaleUpperCase() : '+',
		hue: COVER_HUES[hashString(seed) % COVER_HUES.length],
	};
}
