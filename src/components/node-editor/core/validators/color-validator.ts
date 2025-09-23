/**
 * Color Validator - Validation for color values
 */

import {
	isValidColor,
	isValidHexColor,
	isValidHslColor,
	isValidRgbColor,
	parseColor,
} from '../utils/color-utils';
import type {
	QuickFix,
	ValidationContext,
	ValidationError,
} from './validation-types';

/**
 * Validate hex color format
 */
export function validateHexColor(
	colorValue: string,
	context?: ValidationContext
): ValidationError | null {
	if (isValidHexColor(colorValue)) {
		return null;
	}

	const startIndex = context?.startIndex ?? 0;
	const endIndex = startIndex + colorValue.length;

	// Try to fix the color
	const fallbackColor = fixHexColor(colorValue);

	return {
		type: 'error',
		message: 'Invalid hex color format. Use #RGB or #RRGGBB format.',
		startIndex,
		endIndex,
		suggestion: fallbackColor,
		errorCode: 'COLOR_HEX_INVALID',
		contextualHint:
			'Hex colors should be #RGB or #RRGGBB (e.g., #ff0000 for red)',
		quickFixes: [
			{
				label: 'Fix format',
				replacement: fallbackColor,
				description: 'Convert to valid hex color',
			},
			{
				label: 'Use red',
				replacement: '#ff0000',
				description: 'Set to red color',
			},
			{
				label: 'Use blue',
				replacement: '#0000ff',
				description: 'Set to blue color',
			},
			{
				label: 'Use black',
				replacement: '#000000',
				description: 'Set to black color',
			},
		],
	};
}

/**
 * Validate RGB/RGBA color format
 */
export function validateRgbColor(
	colorValue: string,
	context?: ValidationContext
): ValidationError | null {
	if (isValidRgbColor(colorValue)) {
		return null;
	}

	const startIndex = context?.startIndex ?? 0;
	const endIndex = startIndex + colorValue.length;

	return {
		type: 'error',
		message: 'Invalid RGB color format. Use rgb(r,g,b) or rgba(r,g,b,a).',
		startIndex,
		endIndex,
		suggestion: 'rgb(0, 0, 0)',
		errorCode: 'COLOR_RGB_INVALID',
		contextualHint: 'RGB values should be 0-255, alpha 0-1',
		quickFixes: [
			{
				label: 'Fix format',
				replacement: 'rgb(0, 0, 0)',
				description: 'Use valid RGB format',
			},
			{
				label: 'Use red',
				replacement: 'rgb(255, 0, 0)',
				description: 'Set to red color',
			},
			{
				label: 'Use blue',
				replacement: 'rgb(0, 0, 255)',
				description: 'Set to blue color',
			},
		],
	};
}

/**
 * Validate HSL/HSLA color format
 */
export function validateHslColor(
	colorValue: string,
	context?: ValidationContext
): ValidationError | null {
	if (isValidHslColor(colorValue)) {
		return null;
	}

	const startIndex = context?.startIndex ?? 0;
	const endIndex = startIndex + colorValue.length;

	return {
		type: 'error',
		message: 'Invalid HSL color format. Use hsl(h,s%,l%) or hsla(h,s%,l%,a).',
		startIndex,
		endIndex,
		suggestion: 'hsl(0, 0%, 0%)',
		errorCode: 'COLOR_HSL_INVALID',
		contextualHint: 'Hue: 0-360, Saturation/Lightness: 0-100%, Alpha: 0-1',
		quickFixes: [
			{
				label: 'Fix format',
				replacement: 'hsl(0, 0%, 0%)',
				description: 'Use valid HSL format',
			},
			{
				label: 'Use red',
				replacement: 'hsl(0, 100%, 50%)',
				description: 'Set to red color',
			},
			{
				label: 'Use blue',
				replacement: 'hsl(240, 100%, 50%)',
				description: 'Set to blue color',
			},
		],
	};
}

/**
 * Validate any color format
 */
export function validateColor(
	colorValue: string,
	context?: ValidationContext
): ValidationError | null {
	if (!colorValue || colorValue.trim().length === 0) {
		return {
			type: 'error',
			message: 'Color value cannot be empty.',
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? 0,
			errorCode: 'COLOR_EMPTY',
		};
	}

	if (isValidColor(colorValue)) {
		return null;
	}

	// Check what format was attempted
	if (colorValue.startsWith('#')) {
		return validateHexColor(colorValue, context);
	}

	if (colorValue.startsWith('rgb')) {
		return validateRgbColor(colorValue, context);
	}

	if (colorValue.startsWith('hsl')) {
		return validateHslColor(colorValue, context);
	}

	// Generic color error
	const startIndex = context?.startIndex ?? 0;
	const endIndex = startIndex + colorValue.length;

	return {
		type: 'error',
		message:
			'Invalid color format. Use hex (#RGB), rgb(), hsl(), or named colors.',
		startIndex,
		endIndex,
		errorCode: 'COLOR_INVALID',
		contextualHint: 'Examples: #ff0000, rgb(255,0,0), hsl(0,100%,50%), red',
		quickFixes: getColorQuickFixes(colorValue),
	};
}

/**
 * Try to fix a malformed hex color
 */
function fixHexColor(colorValue: string): string {
	let fixed = colorValue;

	// Ensure it starts with #
	if (!fixed.startsWith('#')) {
		fixed = '#' + fixed;
	}

	// Remove invalid characters
	fixed = fixed.replace(/[^#0-9a-fA-F]/g, '');

	// Ensure proper length
	const hexPart = fixed.slice(1);

	if (hexPart.length === 0) {
		return '#000000';
	}

	if (hexPart.length <= 3) {
		// Pad to 3 characters
		const padded = hexPart.padEnd(3, '0');
		return '#' + padded.slice(0, 3);
	}

	// Pad or truncate to 6 characters
	const final = hexPart.padEnd(6, '0').slice(0, 6);
	return '#' + final;
}

/**
 * Get quick fixes for invalid colors
 */
function getColorQuickFixes(value: string): QuickFix[] {
	const fixes: QuickFix[] = [];

	// Try to parse and fix
	const parsed = parseColor(value);
	if (parsed) {
		fixes.push({
			label: 'Use parsed color',
			replacement: parsed,
			description: 'Use the parsed color value',
		});
	}

	// Add common colors
	fixes.push(
		{ label: 'Use black', replacement: '#000000', description: 'Set to black' },
		{ label: 'Use white', replacement: '#ffffff', description: 'Set to white' },
		{ label: 'Use red', replacement: '#ff0000', description: 'Set to red' },
		{ label: 'Use blue', replacement: '#0000ff', description: 'Set to blue' }
	);

	return fixes;
}

/**
 * Validate color contrast
 */
export function validateColorContrast(
	foreground: string,
	background: string,
	minRatio: number = 4.5
): ValidationError | null {
	// This would require implementing WCAG contrast ratio calculation
	// For now, return null (no error)
	return null;
}

/**
 * Create color validator with options
 */
export function createColorValidator(options?: {
	allowEmpty?: boolean;
	formats?: ('hex' | 'rgb' | 'hsl' | 'named')[];
}) {
	return (value: string, context?: ValidationContext) => {
		if (options?.allowEmpty && !value) {
			return null;
		}

		if (options?.formats) {
			// Validate only specific formats
			const formatValidators = {
				hex: validateHexColor,
				rgb: validateRgbColor,
				hsl: validateHslColor,
				named: (v: string) => null, // Named colors are handled by general validator
			};

			for (const format of options.formats) {
				const validator = formatValidators[format];
				if (validator) {
					const error = validator(value, context);
					if (!error) return null; // Valid in this format
				}
			}

			return {
				type: 'error',
				message: `Color must be in one of these formats: ${options.formats.join(', ')}`,
				startIndex: context?.startIndex ?? 0,
				endIndex: context?.endIndex ?? value.length,
				errorCode: 'COLOR_FORMAT_RESTRICTED',
			};
		}

		return validateColor(value, context);
	};
}
