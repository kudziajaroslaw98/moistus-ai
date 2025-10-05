/**
 * Color Utilities - Color validation, parsing, and formatting
 */

/**
 * Named colors mapping
 */
export const NAMED_COLORS: Record<string, string> = {
	red: '#ff0000',
	blue: '#0000ff',
	green: '#008000',
	yellow: '#ffff00',
	orange: '#ffa500',
	purple: '#800080',
	pink: '#ffc0cb',
	brown: '#a52a2a',
	black: '#000000',
	white: '#ffffff',
	gray: '#808080',
	grey: '#808080',
	cyan: '#00ffff',
	magenta: '#ff00ff',
	lime: '#00ff00',
	navy: '#000080',
	teal: '#008080',
	silver: '#c0c0c0',
	gold: '#ffd700',
	indigo: '#4b0082',
};

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
	return /^#([A-Fa-f0-9]{3}){1,2}$/.test(color);
}

/**
 * Validate RGB/RGBA color format
 */
export function isValidRgbColor(color: string): boolean {
	const rgbPattern =
		/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([01]?\.?\d*))?\s*\)$/;
	const match = color.match(rgbPattern);

	if (!match) return false;

	const [, r, g, b, a] = match;
	const red = parseInt(r, 10);
	const green = parseInt(g, 10);
	const blue = parseInt(b, 10);
	const alpha = a ? parseFloat(a) : 1;

	return (
		red >= 0 &&
		red <= 255 &&
		green >= 0 &&
		green <= 255 &&
		blue >= 0 &&
		blue <= 255 &&
		alpha >= 0 &&
		alpha <= 1
	);
}

/**
 * Validate HSL/HSLA color format
 */
export function isValidHslColor(color: string): boolean {
	const hslPattern =
		/^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([01]?\.?\d*))?\s*\)$/;
	const match = color.match(hslPattern);

	if (!match) return false;

	const [, h, s, l, a] = match;
	const hue = parseInt(h, 10);
	const saturation = parseInt(s, 10);
	const lightness = parseInt(l, 10);
	const alpha = a ? parseFloat(a) : 1;

	return (
		hue >= 0 &&
		hue <= 360 &&
		saturation >= 0 &&
		saturation <= 100 &&
		lightness >= 0 &&
		lightness <= 100 &&
		alpha >= 0 &&
		alpha <= 1
	);
}

/**
 * Validate any color format
 */
export function isValidColor(color: string): boolean {
	if (!color) return false;

	const normalized = color.trim().toLowerCase();

	// Check named colors
	if (NAMED_COLORS[normalized]) return true;

	// Check hex colors
	if (isValidHexColor(color)) return true;

	// Check RGB/RGBA colors
	if (isValidRgbColor(color)) return true;

	// Check HSL/HSLA colors
	if (isValidHslColor(color)) return true;

	return false;
}

/**
 * Parse a color string into a normalized format
 */
export function parseColor(color: string): string | null {
	if (!color) return null;

	const normalized = color.trim().toLowerCase();

	// Named color
	if (NAMED_COLORS[normalized]) {
		return NAMED_COLORS[normalized];
	}

	// Hex color
	if (isValidHexColor(color)) {
		return color.toLowerCase();
	}

	// RGB/RGBA color
	if (isValidRgbColor(color)) {
		return color.replace(/\s+/g, '');
	}

	// HSL/HSLA color
	if (isValidHslColor(color)) {
		return color.replace(/\s+/g, '');
	}

	return null;
}

/**
 * Format color for display
 */
export function formatColorForDisplay(color: string): string {
	const parsed = parseColor(color);
	if (!parsed) return color;

	// If it's a hex color, return uppercase
	if (parsed.startsWith('#')) {
		return parsed.toUpperCase();
	}

	return parsed;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(
	hex: string
): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	if (result) {
		return {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16),
		};
	}

	// Try 3-character hex
	const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);

	if (shortResult) {
		return {
			r: parseInt(shortResult[1] + shortResult[1], 16),
			g: parseInt(shortResult[2] + shortResult[2], 16),
			b: parseInt(shortResult[3] + shortResult[3], 16),
		};
	}

	return null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (n: number) => {
		const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get contrast color (black or white) for a given background
 */
export function getContrastColor(bgColor: string): string {
	const color = parseColor(bgColor);
	if (!color) return '#000000';

	let rgb = null;

	if (color.startsWith('#')) {
		rgb = hexToRgb(color);
	} else if (color.startsWith('rgb')) {
		const match = color.match(/\d+/g);

		if (match && match.length >= 3) {
			rgb = {
				r: parseInt(match[0], 10),
				g: parseInt(match[1], 10),
				b: parseInt(match[2], 10),
			};
		}
	}

	if (!rgb) return '#000000';

	// Calculate luminance
	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

	return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get color suggestions
 */
export function getColorSuggestions(query: string = ''): string[] {
	const colors = Object.keys(NAMED_COLORS);

	if (!query) {
		return colors.slice(0, 10);
	}

	const normalized = query.toLowerCase();
	return colors.filter((color) => color.includes(normalized)).slice(0, 10);
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(color: string, percent: number): string {
	const parsed = parseColor(color);
	if (!parsed) return color;

	let rgb = null;

	if (parsed.startsWith('#')) {
		rgb = hexToRgb(parsed);
	} else if (parsed.startsWith('rgb')) {
		const match = parsed.match(/\d+/g);

		if (match && match.length >= 3) {
			rgb = {
				r: parseInt(match[0], 10),
				g: parseInt(match[1], 10),
				b: parseInt(match[2], 10),
			};
		}
	}

	if (!rgb) return color;

	const factor = percent / 100;
	const r = Math.round(rgb.r + (255 - rgb.r) * factor);
	const g = Math.round(rgb.g + (255 - rgb.g) * factor);
	const b = Math.round(rgb.b + (255 - rgb.b) * factor);

	return rgbToHex(r, g, b);
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(color: string, percent: number): string {
	const parsed = parseColor(color);
	if (!parsed) return color;

	let rgb = null;

	if (parsed.startsWith('#')) {
		rgb = hexToRgb(parsed);
	} else if (parsed.startsWith('rgb')) {
		const match = parsed.match(/\d+/g);

		if (match && match.length >= 3) {
			rgb = {
				r: parseInt(match[0], 10),
				g: parseInt(match[1], 10),
				b: parseInt(match[2], 10),
			};
		}
	}

	if (!rgb) return color;

	const factor = 1 - percent / 100;
	const r = Math.round(rgb.r * factor);
	const g = Math.round(rgb.g * factor);
	const b = Math.round(rgb.b * factor);

	return rgbToHex(r, g, b);
}
