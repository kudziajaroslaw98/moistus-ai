/**
 * Consolidated Node Editor Utilities
 * 
 * This file consolidates all utility functions from:
 * - src/components/node-editor/domain/utilities/text-utils.ts
 * - src/components/node-editor/domain/utilities/parse-utils.ts
 * - src/components/node-editor/utils/completion-types.ts
 * 
 * All utilities for text processing, parsing, completion types, and accessibility
 */

import { Completion, CompletionResult } from "@codemirror/autocomplete";

// ========================================
// TEXT UTILITIES
// ========================================

/**
 * Insert text at the cursor position in a text input or textarea
 * @param currentValue The current value of the input
 * @param textToInsert The text to insert
 * @param cursorPosition The current cursor position
 * @returns The new value and cursor position
 */
export const insertAtCursor = (
	currentValue: string,
	textToInsert: string,
	cursorPosition: number
): { newValue: string; newCursorPosition: number } => {
	const before = currentValue.substring(0, cursorPosition);
	const after = currentValue.substring(cursorPosition);
	const newValue = before + textToInsert + after;
	const newCursorPosition = cursorPosition + textToInsert.length;

	return { newValue, newCursorPosition };
};

/**
 * Replace selected text in a text input or textarea
 * @param currentValue The current value of the input
 * @param textToInsert The text to insert
 * @param selectionStart The start of the selection
 * @param selectionEnd The end of the selection
 * @returns The new value and cursor position
 */
export const replaceSelection = (
	currentValue: string,
	textToInsert: string,
	selectionStart: number,
	selectionEnd: number
): { newValue: string; newCursorPosition: number } => {
	const before = currentValue.substring(0, selectionStart);
	const after = currentValue.substring(selectionEnd);
	const newValue = before + textToInsert + after;
	const newCursorPosition = selectionStart + textToInsert.length;

	return { newValue, newCursorPosition };
};

/**
 * Set the cursor position in a text input or textarea
 * @param element The input element
 * @param position The desired cursor position
 */
export const setCursorPosition = (
	element: HTMLInputElement | HTMLTextAreaElement,
	position: number
): void => {
	if (element.setSelectionRange) {
		element.focus();
		element.setSelectionRange(position, position);
	}
};

/**
 * Get the current cursor position in a text input or textarea
 * @param element The input element
 * @returns The cursor position
 */
export const getCursorPosition = (
	element: HTMLInputElement | HTMLTextAreaElement
): number => {
	return element.selectionStart || 0;
};

/**
 * Announce text to screen readers
 * @param message The message to announce
 * @param priority The priority level ('polite' or 'assertive')
 */
export const announceToScreenReader = (
	message: string,
	priority: 'polite' | 'assertive' = 'polite'
): void => {
	const announcement = document.createElement('div');
	announcement.setAttribute('role', 'status');
	announcement.setAttribute('aria-live', priority);
	announcement.style.position = 'absolute';
	announcement.style.left = '-10000px';
	announcement.style.width = '1px';
	announcement.style.height = '1px';
	announcement.style.overflow = 'hidden';
	announcement.textContent = message;

	document.body.appendChild(announcement);

	// Remove the announcement after a delay
	setTimeout(() => {
		document.body.removeChild(announcement);
	}, 1000);
};

// ========================================
// PARSING UTILITIES
// ========================================

// Parsing utility types
export interface ParsedColor {
	value: string;
	type: 'hex' | 'rgb' | 'tailwind' | 'named';
	isValid: boolean;
}

export interface ParsedSize {
	value: number;
	unit: 'px' | 'rem' | 'em' | '%';
	isValid: boolean;
}

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
	return Array.from(new Set(tags));
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

// ========================================
// COMPLETION TYPES
// ========================================

// Core completion data interfaces
export interface CompletionItem {
	value: string;
	label: string;
	description?: string;
	category?: string;
}

// Enhanced completion item with scoring and metadata
export interface ScoredCompletionItem extends CompletionItem {
	score: number;
	matchType?: 'exact' | 'starts-with' | 'contains' | 'fuzzy';
	matchIndices?: number[];
}

// Pattern types supported by the universal completion system
export type PatternType = 'date' | 'priority' | 'color' | 'tag' | 'assignee';

// Date pattern subtypes for more granular matching
export type DatePatternSubtype = 'word' | 'partial-date' | 'full-date';

// Interface for partial date pattern matching
export interface PartialDatePattern {
	year: string;
	month: string;
	partialDay?: string;
	isComplete: boolean;
	isValid: boolean;
	daysInMonth?: number;
}

// Pattern context information for completion detection
export interface PatternContext {
	type: PatternType;
	pattern: string;
	query: string;
	matchStart: number;
	matchEnd: number;
	fullMatch?: string;
	// Enhanced context for date patterns
	dateSubtype?: DatePatternSubtype;
	partialDate?: PartialDatePattern;
}

// Pattern configuration for validation and processing
export interface PatternConfig {
	regex: RegExp;
	decorationRegex: RegExp; // Global pattern for decorations (matches anywhere in text)
	validationPattern: RegExp;
	prefix: string;
	suffix?: string;
	completionType: string;
	description: string;
}

// Pattern registry for type-safe pattern management
export type PatternRegistry = Record<PatternType, PatternConfig>;

// Completion cache entry with metadata
export interface CompletionCacheEntry {
	result: CompletionResult;
	patternType: PatternType;
	timestamp: number;
	query: string;
	expiresAt: number;
}

// Cache statistics for monitoring and debugging
export interface CompletionCacheStats {
	size: number;
	patternTypeBreakdown: Record<PatternType, number>;
	hitRate: number;
	missRate: number;
	oldestEntryAge: number;
	newestEntryAge: number;
	averageEntryAge: number;
	expiredEntries: number;
}

// Completion source configuration
export interface CompletionSourceConfig {
	maxRenderedOptions: number;
	cacheExpiryMs: number;
	cacheSizeLimit: number;
	fuzzySearchLimit: number;
	enablePatternScoring: boolean;
	enableCategoryBoosts: boolean;
	enableDebugLogging: boolean;
}

// Enhanced completion with custom metadata
export interface EnhancedCompletion extends Completion {
	patternType?: PatternType;
	category?: string;
	matchScore?: number;
	usage?: string;
	examples?: string[];
}

// Completion provider interface for extensibility
export interface CompletionProvider {
	patternType: PatternType;
	getCompletions(query: string, context: PatternContext): Promise<CompletionItem[]> | CompletionItem[];
	isAvailable(): boolean;
	priority: number;
}

// Dynamic completion source for user-specific completions
export interface DynamicCompletionSource {
	getUserTags(): Promise<CompletionItem[]>;
	getUserAssignees(): Promise<CompletionItem[]>;
	getProjectColors(): Promise<CompletionItem[]>;
	getRecentCompletions(patternType: PatternType): Promise<CompletionItem[]>;
	updateUsageStats(completion: CompletionItem, patternType: PatternType): Promise<void>;
	// Date-specific dynamic completions
	getDynamicDateCompletions(partialDate: PartialDatePattern): CompletionItem[];
}

// Completion analytics for usage tracking
export interface CompletionAnalytics {
	totalCompletions: number;
	completionsByPattern: Record<PatternType, number>;
	mostUsedCompletions: Array<{
		completion: CompletionItem;
		patternType: PatternType;
		usageCount: number;
		lastUsed: Date;
	}>;
	averageQueryLength: Record<PatternType, number>;
	completionAcceptanceRate: number;
}

// Fuzzy search configuration
export interface FuzzySearchConfig {
	exactMatchScore: number;
	startsWithScore: number;
	containsScore: number;
	fuzzyMatchScore: number;
	categoryBoosts: Record<string, number>;
	patternBoosts: Record<PatternType, Record<string, number>>;
}

// Pattern matching result
export interface PatternMatchResult {
	matched: boolean;
	patternType?: PatternType;
	query: string;
	position: {
		start: number;
		end: number;
	};
	confidence: number;
}

// Validation result for pattern syntax
export interface PatternValidationResult {
	valid: boolean;
	patternType: PatternType;
	errors: string[];
	warnings: string[];
	suggestions: string[];
}

// Export type guards for runtime type checking
export const isPatternType = (value: string): value is PatternType => {
	return ['date', 'priority', 'color', 'tag', 'assignee'].includes(value);
};

export const isCompletionItem = (value: unknown): value is CompletionItem => {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as CompletionItem).value === 'string' &&
		typeof (value as CompletionItem).label === 'string'
	);
};

export const isPatternContext = (value: unknown): value is PatternContext => {
	return (
		typeof value === 'object' &&
		value !== null &&
		isPatternType((value as PatternContext).type) &&
		typeof (value as PatternContext).pattern === 'string' &&
		typeof (value as PatternContext).query === 'string' &&
		typeof (value as PatternContext).matchStart === 'number' &&
		typeof (value as PatternContext).matchEnd === 'number'
	);
};

// Default configurations
export const DEFAULT_COMPLETION_CONFIG: CompletionSourceConfig = {
	maxRenderedOptions: 12,
	cacheExpiryMs: 30000,
	cacheSizeLimit: 100,
	fuzzySearchLimit: 15,
	enablePatternScoring: true,
	enableCategoryBoosts: true,
	enableDebugLogging: true,
};

export const DEFAULT_FUZZY_SEARCH_CONFIG: FuzzySearchConfig = {
	exactMatchScore: 1000,
	startsWithScore: 100,
	containsScore: 50,
	fuzzyMatchScore: 10,
	categoryBoosts: {
		'Quick': 50,
		'Basic': 20,
		'Status': 15,
		'Priority': 30,
		'Roles': 25,
	},
	patternBoosts: {
		date: {
			'today': 50,
			'tomorrow': 50,
			'yesterday': 30,
		},
		priority: {
			'high': 30,
			'medium': 20,
			'low': 20,
			'critical': 40,
		},
		color: {},
		tag: {},
		assignee: {
			'me': 40,
			'team': 30,
		},
	},
};

// Pattern registry with all supported patterns
export const PATTERN_REGISTRY: PatternRegistry = {
	date: {
		regex: /@([^@\s]*)$/,
		decorationRegex: /@([^@\s]*)/g,
		validationPattern: /^@[\w-]*$/,
		prefix: '@',
		completionType: 'keyword',
		description: 'Date and time references (@today, @tomorrow, @monday, @2025-01-15)',
	},
	priority: {
		regex: /#([^#\s]*)$/,
		decorationRegex: /#([^#\s]*)/g,
		validationPattern: /^#[\w-]*$/,
		prefix: '#',
		completionType: 'variable',
		description: 'Priority levels and status (#high, #medium, #low)',
	},
	color: {
		regex: /color:([^:\s]*)$/,
		decorationRegex: /color:([^:\s]*)/g,
		validationPattern: /^color:[\w#-]*$/,
		prefix: 'color:',
		completionType: 'property',
		description: 'Color values (color:#ff0000, color:red)',
	},
	tag: {
		regex: /\[([^\[\]]*)$/,
		decorationRegex: /\[([^\[\]]*)\]/g,
		validationPattern: /^\[[\w\s-]*$/,
		prefix: '[',
		suffix: ']',
		completionType: 'type',
		description: 'Tags and categories ([meeting], [urgent], [todo])',
	},
	assignee: {
		regex: /\+([^+\s]*)$/,
		decorationRegex: /\+([^+\s]*)/g,
		validationPattern: /^\+[\w.-]*$/,
		prefix: '+',
		completionType: 'function',
		description: 'Assignee references (+john, +team-lead, +me)',
	},
};

// ========================================
// UTILITY EXPORTS
// ========================================

// All types and functions are exported inline above
// This consolidated utils file provides all necessary functionality
// for text processing, parsing, and completion system types