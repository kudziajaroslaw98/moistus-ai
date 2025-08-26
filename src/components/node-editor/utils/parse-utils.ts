import type { ParsedColor, ParsedSize } from '../types';

// Common parsing patterns
export const CommonPatterns = {
	date: /@(\S+)/g,
	tags: /\[([\w,\s]+)\]/g,
	priority: /#(low|medium|high)/i,
	color: /color:([#\w-]+)/i,
	size: /@(\d+(?:\.\d+)?)(px|rem|em|%)?/,
	bold: /\*\*(.*?)\*\*/g,
	italic: /(?<!\*)\*([^*]+)\*(?!\*)|\b_([^_]+)_\b/g,
	alignment: /align:(left|center|right)/i,
};

// Extract pattern from input string
export interface ExtractResult {
	value: string | null;
	cleanedInput: string;
	matches: RegExpMatchArray | null;
}

export const extractPattern = (
	input: string,
	pattern: RegExp
): ExtractResult => {
	const matches = pattern.exec(input);

	if (!matches) {
		return {
			value: null,
			cleanedInput: input,
			matches: null,
		};
	}

	const value = matches[1] || matches[0];
	const cleanedInput = input.replace(matches[0], '').trim();

	return {
		value,
		cleanedInput,
		matches,
	};
};

// Parse color value (hex, rgb, tailwind, named)
export const parseColor = (color: string): ParsedColor => {
	// Hex color pattern
	const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

	if (hexPattern.test(color)) {
		return {
			value: color,
			type: 'hex',
			isValid: true,
		};
	}

	// RGB/RGBA pattern
	const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;

	if (rgbPattern.test(color)) {
		return {
			value: color,
			type: 'rgb',
			isValid: true,
		};
	}

	// Tailwind color pattern (e.g., blue-500, red-400)
	const tailwindPattern = /^[a-z]+-\d{2,3}$/;

	if (tailwindPattern.test(color)) {
		return {
			value: color,
			type: 'tailwind',
			isValid: true,
		};
	}

	// Named colors
	const namedColors = [
		'red',
		'blue',
		'green',
		'yellow',
		'purple',
		'pink',
		'orange',
		'teal',
		'cyan',
		'gray',
		'black',
		'white',
		'indigo',
		'violet',
	];

	if (namedColors.includes(color.toLowerCase())) {
		return {
			value: color.toLowerCase(),
			type: 'named',
			isValid: true,
		};
	}

	// Default - treat as potentially valid custom value
	return {
		value: color,
		type: 'named',
		isValid: true,
	};
};

// Parse font size value
export const parseFontSize = (size: string): ParsedSize => {
	const sizePattern = /^(\d+(?:\.\d+)?)(px|rem|em|%)?$/;
	const matches = sizePattern.exec(size);

	if (!matches) {
		return {
			value: 16,
			unit: 'px',
			isValid: false,
		};
	}

	const value = parseFloat(matches[1]);
	const unit = (matches[2] || 'px') as 'px' | 'rem' | 'em' | '%';

	// Validate reasonable size ranges
	const isValid =
		(unit === 'px' && value >= 8 && value <= 128) ||
		(unit === 'rem' && value >= 0.5 && value <= 8) ||
		(unit === 'em' && value >= 0.5 && value <= 8) ||
		(unit === '%' && value >= 50 && value <= 400);

	return {
		value,
		unit,
		isValid,
	};
};

// Parse date strings with natural language support
export const parseDate = (dateStr: string): Date | undefined => {
	const lowerDate = dateStr.toLowerCase().trim();
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Handle relative dates
	switch (lowerDate) {
		case 'today':
			return today;
		case 'tomorrow':
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			return tomorrow;
		case 'yesterday':
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			return yesterday;
		case 'next week':
			const nextWeek = new Date(today);
			nextWeek.setDate(nextWeek.getDate() + 7);
			return nextWeek;
		case 'next month':
			const nextMonth = new Date(today);
			nextMonth.setMonth(nextMonth.getMonth() + 1);
			return nextMonth;
	}

	// Handle weekday names
	const weekdays = [
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
	];
	const weekdayIndex = weekdays.indexOf(lowerDate);

	if (weekdayIndex !== -1) {
		const targetDate = new Date(today);
		const currentDay = today.getDay();
		const daysUntilTarget = (weekdayIndex - currentDay + 7) % 7 || 7;
		targetDate.setDate(targetDate.getDate() + daysUntilTarget);
		return targetDate;
	}

	// Handle relative days (e.g., "in 3 days", "+5 days")
	const relativeDaysPattern = /^(?:in\s+)?(\+)?(\d+)\s+days?$/;
	const relativeDaysMatch = relativeDaysPattern.exec(lowerDate);

	if (relativeDaysMatch) {
		const days = parseInt(relativeDaysMatch[2]);
		const relativeDate = new Date(today);
		relativeDate.setDate(relativeDate.getDate() + days);
		return relativeDate;
	}

	// Try parsing as standard date
	const parsed = new Date(dateStr);
	return isNaN(parsed.getTime()) ? undefined : parsed;
};

// Parse comma-separated or bracket-enclosed tags
export const parseTags = (input: string): string[] => {
	const tags: string[] = [];

	// Check for bracket notation first [tag1, tag2, tag3]
	const bracketPattern = /\[([\w,\s-]+)\]/g;
	let bracketMatch;

	while ((bracketMatch = bracketPattern.exec(input)) !== null) {
		const tagString = bracketMatch[1];
		const splitTags = tagString
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
		tags.push(...splitTags);
	}

	// If no brackets found, try comma-separated
	if (tags.length === 0 && input.includes(',')) {
		const splitTags = input
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0 && !t.includes(' '));
		tags.push(...splitTags);
	}

	// Remove duplicates and return
	return [...new Set(tags)];
};

// Parse priority values
export type Priority = 'low' | 'medium' | 'high';

export const parsePriority = (input: string): Priority | undefined => {
	const lowerInput = input.toLowerCase().trim();

	// Direct priority values
	if (['low', 'medium', 'high'].includes(lowerInput)) {
		return lowerInput as Priority;
	}

	// Numeric priority mapping
	const numericPriority: Record<string, Priority> = {
		'1': 'low',
		'2': 'medium',
		'3': 'high',
	};

	if (numericPriority[lowerInput]) {
		return numericPriority[lowerInput];
	}

	// Alias mapping
	const aliasMap: Record<string, Priority> = {
		l: 'low',
		lo: 'low',
		m: 'medium',
		med: 'medium',
		mid: 'medium',
		h: 'high',
		hi: 'high',
		urgent: 'high',
		important: 'high',
		critical: 'high',
		normal: 'medium',
		trivial: 'low',
		minor: 'low',
	};

	return aliasMap[lowerInput];
};

// Clean text content by removing all parsing patterns
export const cleanContent = (input: string, patterns: RegExp[]): string => {
	let cleaned = input;

	for (const pattern of patterns) {
		// Reset the pattern's lastIndex if it's global
		if (pattern.global) {
			pattern.lastIndex = 0;
		}

		cleaned = cleaned.replace(pattern, '');
	}

	// Clean up extra whitespace
	return cleaned.replace(/\s+/g, ' ').trim();
};

// Validate and sanitize parsed values
export const validateMetadataValue = (type: string, value: any): boolean => {
	switch (type) {
		case 'fontSize':
			return typeof value === 'string' && parseFontSize(value).isValid;

		case 'color':
			return typeof value === 'string' && parseColor(value).isValid;

		case 'priority':
			return ['low', 'medium', 'high'].includes(value);

		case 'tags':
			return Array.isArray(value) && value.every((t) => typeof t === 'string');

		case 'date':
			return value instanceof Date && !isNaN(value.getTime());

		case 'alignment':
			return ['left', 'center', 'right'].includes(value);

		default:
			return true;
	}
};
