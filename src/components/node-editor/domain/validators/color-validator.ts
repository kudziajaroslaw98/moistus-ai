/**
 * Color validation utilities
 * Validates hex colors, RGB, named colors with quick fixes
 */

import type { ValidationError } from '../../utils/validation';

/**
 * Validate hex colors with comprehensive error handling and quick fixes
 */
export const validateColor = (colorValue: string, startIndex: number): ValidationError | null => {
	// Check if it's a valid hex color (3 or 6 characters after #)
	const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
	
	if (!hexPattern.test(colorValue)) {
		const fallbackColor = colorValue.length > 1 ? '#' + colorValue.slice(1).replace(/[^0-9a-fA-F]/g, '0').padEnd(6, '0').slice(0, 6) : '#000000';
		
		return {
			type: 'error',
			message: 'Invalid hex color format. Use #RGB or #RRGGBB format.',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: fallbackColor,
			errorCode: 'COLOR_FORMAT_INVALID',
			contextualHint: 'Use #RGB or #RRGGBB format (e.g., #ff0000 for red)',
			quickFixes: [
				{ label: 'Fix format', replacement: fallbackColor, description: 'Convert to valid hex color' },
				{ label: 'Use red', replacement: '#ff0000', description: 'Set to red color' },
				{ label: 'Use blue', replacement: '#0000ff', description: 'Set to blue color' },
				{ label: 'Use black', replacement: '#000000', description: 'Set to black color' }
			]
		};
	}
	
	return null;
};

/**
 * Validate RGB/RGBA color format
 */
export const validateRgbColor = (colorValue: string, startIndex: number): ValidationError | null => {
	const rgbPattern = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([01]?\.?\d*))?\s*\)$/;
	const match = colorValue.match(rgbPattern);
	
	if (!match) {
		return {
			type: 'error',
			message: 'Invalid RGB color format. Use rgb(r,g,b) or rgba(r,g,b,a).',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: 'rgb(0, 0, 0)',
			errorCode: 'RGB_FORMAT_INVALID',
			contextualHint: 'RGB values should be 0-255, alpha 0-1',
			quickFixes: [
				{ label: 'Fix format', replacement: 'rgb(0, 0, 0)', description: 'Use valid RGB format' },
				{ label: 'Use red', replacement: 'rgb(255, 0, 0)', description: 'Set to red color' },
				{ label: 'Use blue', replacement: 'rgb(0, 0, 255)', description: 'Set to blue color' }
			]
		};
	}
	
	const [, r, g, b, a] = match;
	const red = parseInt(r, 10);
	const green = parseInt(g, 10);
	const blue = parseInt(b, 10);
	const alpha = a ? parseFloat(a) : 1;
	
	if (red > 255 || green > 255 || blue > 255) {
		return {
			type: 'error',
			message: 'RGB values must be between 0-255.',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: `rgb(${Math.min(red, 255)}, ${Math.min(green, 255)}, ${Math.min(blue, 255)})`,
			errorCode: 'RGB_VALUES_OUT_OF_RANGE'
		};
	}
	
	if (alpha > 1 || alpha < 0) {
		return {
			type: 'error',
			message: 'Alpha value must be between 0-1.',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`,
			errorCode: 'ALPHA_VALUE_OUT_OF_RANGE'
		};
	}
	
	return null;
};

/**
 * Validate named colors
 */
export const validateNamedColor = (colorValue: string, startIndex: number): ValidationError | null => {
	const namedColors = [
		'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
		'black', 'white', 'gray', 'grey', 'brown', 'cyan', 'magenta'
	];
	
	const normalizedColor = colorValue.toLowerCase();
	if (!namedColors.includes(normalizedColor)) {
		const suggestions = namedColors.filter(color => 
			color.startsWith(normalizedColor.charAt(0))
		).slice(0, 3);
		
		return {
			type: 'warning',
			message: `Unknown named color: ${colorValue}`,
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: suggestions[0] || 'black',
			errorCode: 'UNKNOWN_NAMED_COLOR',
			contextualHint: `Valid named colors: ${namedColors.join(', ')}`,
			quickFixes: suggestions.map(color => ({
				label: `Use ${color}`,
				replacement: color,
				description: `Change to ${color}`
			}))
		};
	}
	
	return null;
};

/**
 * Check if color value is valid in any format
 */
export const isValidColor = (colorValue: string): boolean => {
	// Check hex
	if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorValue)) {
		return true;
	}
	
	// Check RGB/RGBA
	if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[01]?\.?\d*)?\s*\)$/.test(colorValue)) {
		return true;
	}
	
	// Check named colors
	const namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'grey'];
	return namedColors.includes(colorValue.toLowerCase());
};

/**
 * Convert color to hex format if possible
 */
export const convertToHex = (colorValue: string): string | null => {
	// Already hex
	if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorValue)) {
		return colorValue.toUpperCase();
	}
	
	// Named color conversion
	const namedColors: Record<string, string> = {
		red: '#FF0000', blue: '#0000FF', green: '#008000',
		yellow: '#FFFF00', orange: '#FFA500', purple: '#800080',
		pink: '#FFC0CB', black: '#000000', white: '#FFFFFF',
		gray: '#808080', grey: '#808080'
	};
	
	return namedColors[colorValue.toLowerCase()] || null;
};