/**
 * Pattern Parser - Core parsing logic for node editor patterns
 * Handles extraction and processing of metadata patterns from text input
 */

export type PatternType =
	| 'date'
	| 'priority'
	| 'tag'
	| 'assignee'
	| 'color'
	| 'fontSize'
	| 'status'
	| 'checkbox';

export interface ExtractedPattern {
	type: PatternType;
	value: string;
	display: string;
	startIndex: number;
	endIndex: number;
}

export interface ParsedMetadata {
	priority?: string;
	dueDate?: string | Date;
	assignee?: string | string[];
	status?: string;
	tags?: string[];
	color?: string;
	fontSize?: string;
	[key: string]: any;
}

// Pattern matchers with improved regex
const PATTERN_MATCHERS = {
	priority:
		/(?:^|\s)#(high|medium|low|critical|urgent|asap|blocked|waiting)\b/gi,
	date: /(?:^|\s)\^([^\s^]+)/g,
	assignee: /(?:^|\s)@([^\s@]+)/g,
	status: /(?:^|\s)!([^\s!]+)/g,
	tag: /\[([^\[\]]+)\]/g,
	color: /(?:^|\s)color:([#\w-]+)/gi,
	fontSize: /(?:^|\s)sz:(\d+(?:px|rem|em)?)/gi,
	checkbox: /\[([ x])\]/gi,
} as const;

/**
 * Extract all patterns from text
 */
export function extractPatterns(text: string): ExtractedPattern[] {
	const patterns: ExtractedPattern[] = [];

	for (const [type, regex] of Object.entries(PATTERN_MATCHERS)) {
		regex.lastIndex = 0;
		let match;

		while ((match = regex.exec(text)) !== null) {
			patterns.push({
				type: type as PatternType,
				value: match[1],
				display: formatPatternDisplay(type as PatternType, match[1]),
				startIndex: match.index,
				endIndex: match.index + match[0].length,
			});
		}
	}

	return patterns.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Format pattern for display
 */
function formatPatternDisplay(type: PatternType, value: string): string {
	switch (type) {
		case 'priority':
			return value.charAt(0).toUpperCase() + value.slice(1);
		case 'date':
			return parseDateValue(value);
		case 'color':
			return value.toUpperCase();
		default:
			return value;
	}
}

/**
 * Parse date value from pattern
 */
function parseDateValue(value: string): string {
	const today = new Date();
	const lowerValue = value.toLowerCase();

	// Named dates
	const namedDates: Record<string, () => Date> = {
		today: () => today,
		tomorrow: () => new Date(today.getTime() + 24 * 60 * 60 * 1000),
		yesterday: () => new Date(today.getTime() - 24 * 60 * 60 * 1000),
		monday: () => getNextWeekday(1),
		tuesday: () => getNextWeekday(2),
		wednesday: () => getNextWeekday(3),
		thursday: () => getNextWeekday(4),
		friday: () => getNextWeekday(5),
		saturday: () => getNextWeekday(6),
		sunday: () => getNextWeekday(0),
	};

	if (namedDates[lowerValue]) {
		return namedDates[lowerValue]().toLocaleDateString();
	}

	// Try parsing as date string
	const parsed = new Date(value);
	if (!isNaN(parsed.getTime())) {
		return parsed.toLocaleDateString();
	}

	return value;
}

/**
 * Get next occurrence of a weekday
 */
function getNextWeekday(targetDay: number): Date {
	const today = new Date();
	const currentDay = today.getDay();
	const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
	return new Date(today.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
}

/**
 * Clean text by removing patterns
 */
export function cleanTextFromPatterns(text: string): string {
	let cleanText = text;

	// Remove patterns in reverse order to maintain indices
	const patterns = extractPatterns(text);
	for (let i = patterns.length - 1; i >= 0; i--) {
		const pattern = patterns[i];
		cleanText =
			cleanText.slice(0, pattern.startIndex) +
			cleanText.slice(pattern.endIndex);
	}

	return cleanText.replace(/\s+/g, ' ').trim();
}

/**
 * Parse metadata from patterns
 */
export function parseMetadata(text: string): ParsedMetadata {
	const patterns = extractPatterns(text);
	const metadata: ParsedMetadata = {};

	for (const pattern of patterns) {
		switch (pattern.type) {
			case 'priority':
				metadata.priority = pattern.value;
				break;
			case 'date':
				metadata.dueDate = parseDateValue(pattern.value);
				break;
			case 'assignee':
				if (!metadata.assignee) {
					metadata.assignee = [];
				}
				if (Array.isArray(metadata.assignee)) {
					metadata.assignee.push(pattern.value);
				}
				break;
			case 'status':
				metadata.status = pattern.value;
				break;
			case 'tag':
				if (!metadata.tags) {
					metadata.tags = [];
				}
				metadata.tags.push(...pattern.value.split(',').map((t) => t.trim()));
				break;
			case 'color':
				metadata.color = pattern.value;
				break;
			case 'fontSize':
				metadata.fontSize = pattern.value;
				break;
		}
	}

	return metadata;
}

/**
 * Main parsing function
 */
export function parseInput(text: string): {
	content: string;
	metadata: ParsedMetadata;
	patterns: ExtractedPattern[];
} {
	const patterns = extractPatterns(text);
	const metadata = parseMetadata(text);
	const content = cleanTextFromPatterns(text);

	return {
		content,
		metadata,
		patterns,
	};
}
