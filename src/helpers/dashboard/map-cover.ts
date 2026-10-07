/** Small stable string hash (non-negative 32-bit). */
export function hashString(value: string): number {
	let hash = 0;

	for (let i = 0; i < value.length; i++) {
		hash = (hash << 5) - hash + value.charCodeAt(i);
		hash |= 0;
	}

	return Math.abs(hash);
}

// Dark, muted tones so covers sit calmly on the dark dashboard.
const hsl = (hue: number, saturation: number, lightness: number, alpha = 1) =>
	`hsla(${hue % 360}, ${saturation}%, ${lightness}%, ${alpha})`;

/**
 * Deterministic card cover for a map: two soft color glows placed and tinted
 * from the id, so every map looks distinct but always the same. A dotted
 * texture is layered on top (kept in the same background so one element is
 * enough).
 */
export function getMapCoverStyle(seed: string) {
	const hash = hashString(seed);
	const hueA = hash % 360;
	// Neighbouring hue keeps the pair harmonious instead of garish.
	const hueB = (hueA + 40 + (hash % 50)) % 360;
	const ax = 15 + (hash % 35);
	const ay = 10 + ((hash >> 3) % 40);
	const bx = 55 + ((hash >> 5) % 40);
	const by = 55 + ((hash >> 7) % 40);

	return {
		backgroundImage: [
			'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1.3px)',
			`radial-gradient(70% 100% at ${ax}% ${ay}%, ${hsl(hueA, 60, 38, 0.75)}, transparent 70%)`,
			`radial-gradient(65% 95% at ${bx}% ${by}%, ${hsl(hueB, 55, 32, 0.7)}, transparent 70%)`,
		].join(', '),
		backgroundSize: '18px 18px, auto, auto',
		backgroundColor: '#0b0c0f',
	};
}
