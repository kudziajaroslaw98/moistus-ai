import { useMemo } from 'react';

export interface UserColorResult {
	hsl: string;
	hex: string;
	hue: number;
	saturation: number;
	lightness: number;
}

/**
 * Simple hash function to generate consistent numbers from strings
 */
function hashString(str: string): number {
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	return Math.abs(hash);
}

/**
 * Convert HSL to Hex color format
 */
function hslToHex(h: number, s: number, l: number): string {
	const hDecimal = h / 360;
	const sDecimal = s / 100;
	const lDecimal = l / 100;

	const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
	const x = c * (1 - Math.abs(((hDecimal * 6) % 2) - 1));
	const m = lDecimal - c / 2;

	let r = 0;
	let g = 0;
	let b = 0;

	if (0 <= hDecimal && hDecimal < 1 / 6) {
		r = c;
		g = x;
		b = 0;
	} else if (1 / 6 <= hDecimal && hDecimal < 2 / 6) {
		r = x;
		g = c;
		b = 0;
	} else if (2 / 6 <= hDecimal && hDecimal < 3 / 6) {
		r = 0;
		g = c;
		b = x;
	} else if (3 / 6 <= hDecimal && hDecimal < 4 / 6) {
		r = 0;
		g = x;
		b = c;
	} else if (4 / 6 <= hDecimal && hDecimal < 5 / 6) {
		r = x;
		g = 0;
		b = c;
	} else if (5 / 6 <= hDecimal && hDecimal < 1) {
		r = c;
		g = 0;
		b = x;
	}

	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);

	const toHex = (n: number) => {
		const hex = n.toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Hook that generates consistent HSL and hex colors based on a seed string
 *
 * @param seed - String to generate color from (e.g., user ID, email, etc.)
 * @returns Object containing HSL string, hex string, and individual HSL values
 *
 * @example
 * ```tsx
 * const { hsl, hex } = useUserColor('user-123');
 * // hsl: "hsl(240, 75%, 60%)"
 * // hex: "#4d79ff"
 * ```
 */
export function useUserColor(seed: string): UserColorResult {
	return useMemo(() => {
		if (!seed || seed.trim().length === 0) {
			// Default color for empty/invalid seeds
			return {
				hsl: 'hsl(200, 50%, 50%)',
				hex: '#4d9db8',
				hue: 200,
				saturation: 50,
				lightness: 50,
			};
		}

		// Generate hash from seed
		const hash = hashString(seed.trim());

		// Generate HSL values
		// Hue: Full range 0-360 for maximum color variety
		const hue = hash % 360;

		// Saturation: 60-85% for vibrant but not overwhelming colors
		const saturation = 60 + (hash % 26);

		// Lightness: 45-65% for good contrast and readability
		const lightness = 45 + (hash % 21);

		const hsl = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
		const hex = hslToHex(hue, saturation, lightness);

		return {
			hsl,
			hex,
			hue,
			saturation,
			lightness,
		};
	}, [seed]);
}
