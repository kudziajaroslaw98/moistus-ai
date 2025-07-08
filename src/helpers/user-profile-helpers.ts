/**
 * User Profile Helper Functions
 *
 * Utilities for generating consistent user avatars, colors, and fun names
 * based on user identifiers. These functions use deterministic hashing
 * to ensure the same input always produces the same output.
 */

// User Profile Interface
export interface UserProfile {
	id: string;
	email?: string;
	displayName: string;
	avatarUrl?: string;
	color: { hsl: string; hex: string };
	isAnonymous: boolean;
}

/**
 * Generate a professional avatar using DiceBear API
 */
export const generateFallbackAvatar = (seed: string): string => {
	const style = 'lorelei'; // Professional illustrated portraits
	const backgroundColor = generateUserColor(seed).hex || '09090b'; // Dark background to match theme

	const baseUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
	const params = new URLSearchParams();

	if (backgroundColor) {
		params.set('backgroundColor', backgroundColor.replace('#', ''));
	}

	return `${baseUrl}&${params.toString()}`;
};

/**
 * Generate a consistent color using HSL color space
 * Provides better color variety and visual appeal than fixed color arrays
 */
export const generateUserColor = (
	userId: string
): { hsl: string; hex: string } => {
	if (!userId || userId.trim().length === 0) {
		return { hsl: 'hsl(195, 45%, 50%)', hex: '#4d9db8' }; // Default color for empty/invalid seeds
	}

	// Generate hash from userId
	let hash = 0;

	for (let i = 0; i < userId.length; i++) {
		const char = userId.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	hash = Math.abs(hash);

	// Generate HSL values
	// Hue: Full range 0-360 for maximum color variety
	const hue = hash % 360;

	// Saturation: 60-85% for vibrant but not overwhelming colors
	const saturation = 60 + (hash % 26);

	// Lightness: 45-65% for good contrast and readability
	const lightness = 45 + (hash % 21);

	// Convert HSL to Hex
	const hDecimal = hue / 360;
	const sDecimal = saturation / 100;
	const lDecimal = lightness / 100;

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

	const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	const hslColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

	return {
		hsl: hslColor,
		hex: hexColor,
	};
};

/**
 * Generate a fun, memorable name using adjectives and animals
 * Used as fallback for displayName when user metadata is not available
 * Examples: "Creative Tiger", "Adventurous Panda", "Wise Eagle"
 */
export const generateFunName = (userId: string): string => {
	const adjectives = [
		'Adventurous',
		'Brave',
		'Creative',
		'Daring',
		'Energetic',
		'Friendly',
		'Gentle',
		'Happy',
		'Inspiring',
		'Joyful',
		'Kind',
		'Lively',
		'Mighty',
		'Noble',
		'Optimistic',
		'Playful',
		'Quick',
		'Radiant',
		'Spirited',
		'Thoughtful',
		'Unique',
		'Vibrant',
		'Wise',
		'Zesty',
	];

	const animals = [
		'Panda',
		'Dolphin',
		'Tiger',
		'Eagle',
		'Fox',
		'Wolf',
		'Bear',
		'Lion',
		'Owl',
		'Hawk',
		'Deer',
		'Rabbit',
		'Koala',
		'Penguin',
		'Otter',
		'Seal',
		'Falcon',
		'Jaguar',
		'Leopard',
		'Cheetah',
		'Flamingo',
		'Peacock',
		'Butterfly',
		'Dragonfly',
	];

	if (!userId) userId = 'anonymous';

	// Simple hash function to make it deterministic
	let hash = 0;

	for (let i = 0; i < userId.length; i++) {
		const char = userId.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	const adjIndex = Math.abs(hash) % adjectives.length;
	const animalIndex = Math.abs(hash >> 16) % animals.length;

	return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
};

/**
 * Simple hash function for consistent pseudo-random generation
 * Used internally by other helper functions
 */
export const hashString = (str: string): number => {
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	return Math.abs(hash);
};

/**
 * Convert HSL values to hex color format
 * Used internally by generateUserColor
 */
export const hslToHex = (h: number, s: number, l: number): string => {
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
};
