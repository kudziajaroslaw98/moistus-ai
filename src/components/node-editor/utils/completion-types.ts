/**
 * TypeScript interfaces and types for the universal completion system
 * Provides comprehensive type safety for all completion-related functionality
 */

import { Completion, CompletionResult } from "@codemirror/autocomplete"

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