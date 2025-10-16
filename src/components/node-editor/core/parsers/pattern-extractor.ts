/**
 * Pattern Extractor - Extract and parse patterns from text
 * Universal metadata principle: ALL patterns work in ALL node types
 */

import type { NodeData } from '@/types/node-data';
import { formatColorForDisplay } from '../utils/color-utils';
import { formatDateForDisplay, parseDateString } from '../utils/date-utils';
import { formatPriorityForDisplay } from '../utils/priority-utils';

/**
 * Pattern types that can be extracted
 */
export type PatternType =
	| 'date'
	| 'priority'
	| 'color'
	| 'tag'
	| 'assignee'
	| 'checkbox'
	| 'fontSize'
	| 'fontWeight'
	| 'fontStyle'
	| 'textAlign'
	| 'backgroundColor'
	| 'options'
	| 'question'
	| 'multiple'
	| 'reference'
	| 'borderColor'
	| 'title'
	| 'label'
	| 'showBackground'
	| 'isCollapsed'
	| 'imageUrl'
	| 'altText'
	| 'caption'
	| 'source'
	| 'url'
	| 'language'
	| 'fileName'
	| 'status'
	| 'confidence'
	| 'bold'
	| 'italic'
	| 'alignment';

/**
 * Extracted pattern information
 */
export interface ExtractedPattern {
	type: PatternType;
	value: string;
	display: string;
	position: number;
	raw: string;
}

/**
 * Extracted data from text
 */
export interface ExtractedData {
	cleanText: string;
	patterns: ExtractedPattern[];
	metadata: Record<string, any>;
}

/**
 * Parsed metadata type for backwards compatibility with pattern-parser
 */
export interface ParsedMetadata extends Partial<Record<PatternType, unknown>> {
	priority?: string;
	dueDate?: string | Date;
	assignee?: string | string[];
	status?: string;
	tags?: string[];
	color?: string;
	fontSize?: string;
	questionType?: 'binary' | 'multiple';
	responseFormat?: {
		options: Array<{ id: string; label: string }>;
		allowMultiple: boolean;
	};
}

/**
 * Pattern configuration
 */
interface PatternConfig {
	regex: RegExp;
	type: PatternType;
	extract: (match: RegExpMatchArray) => { value: string; display: string };
	metadataKey?: string;
}

/**
 * Pattern configurations for extraction
 */
const PATTERN_CONFIGS: PatternConfig[] = [
	// Date pattern: ^date (like ^today, ^tomorrow, ^2024-12-25)
	{
		regex: /\^(\S+)/g,
		type: 'date',
		extract: (match) => {
			const dateStr = match[1];
			const date = parseDateString(dateStr);
			return {
				value: dateStr,
				display: date ? formatDateForDisplay(date) : dateStr,
			};
		},
		metadataKey: 'dueDate', // Changed from 'date' to match PreviewRenderer expectations
	},

	// Priority pattern: !priority (like !high, !1, or !! for medium, !!! for high)
	{
		regex:
			/!(high|medium|low|critical|urgent|asap|blocked|waiting|1|2|3)\b|!{1,3}(?!\w)/gi,
		type: 'priority',
		extract: (match) => {
			const value = match[0];
			// Handle ! patterns: ! = low, !! = medium, !!! = high
			if (value === '!')
				return { value: 'low', display: formatPriorityForDisplay('low') };
			if (value === '!!')
				return { value: 'medium', display: formatPriorityForDisplay('medium') };
			if (value === '!!!')
				return { value: 'high', display: formatPriorityForDisplay('high') };
			// Handle numbered priorities
			if (match[1] === '1')
				return { value: 'high', display: formatPriorityForDisplay('high') };
			if (match[1] === '2')
				return { value: 'medium', display: formatPriorityForDisplay('medium') };
			if (match[1] === '3')
				return { value: 'low', display: formatPriorityForDisplay('low') };
			// Handle named priorities
			return {
				value: match[1].toLowerCase(),
				display: formatPriorityForDisplay(match[1].toLowerCase()),
			};
		},
		metadataKey: 'priority',
	},

	// Color pattern: color:value
	{
		regex: /color:(\S+)/gi,
		type: 'color',
		extract: (match) => ({
			value: match[1],
			display: formatColorForDisplay(match[1]),
		}),
		metadataKey: 'textColor',
	},

	// Background color pattern: bg:value
	{
		regex: /bg:(\S+)/gi,
		type: 'backgroundColor',
		extract: (match) => ({
			value: match[1],
			display: formatColorForDisplay(match[1]),
		}),
		metadataKey: 'backgroundColor',
	},

	// Question type pattern: question:value
	{
		regex: /(?:^|\s)question:(binary|multiple)/gi,
		type: 'question',
		extract: (match) => ({
			value: match[1],
			display: `question:${match[1]}`,
		}),
		metadataKey: 'questionType',
	},

	// Is multiple question pattern: multiple:value
	{
		regex: /(?:^|\s)multiple:(true|false)/gi,
		type: 'multiple',
		extract: (match) => ({
			value: match[1],
			display: `multiple:${match[1]}`,
		}),
		metadataKey: 'responseFormat.allowMultiple',
	},

		// Question options pattern: options:[value,value2,value3]
	{
		regex: /(?:^|\s)options:\[([a-zA-Z0-9,\s]*)\]/gi,
		type: 'options',
		extract: (match) => ({
			value: match[1],
			display: `options:[${match[1]}]`,
		}),
		metadataKey: 'responseFormat.options',
	},

	// Border color pattern: border:value
	{
		regex: /border:(\S+)/gi,
		type: 'borderColor',
		extract: (match) => ({
			value: match[1],
			display: formatColorForDisplay(match[1]),
		}),
		metadataKey: 'borderColor',
	},

	// Tag pattern: #tag (like #bug, #feature, #urgent)
	{
		regex: /#([a-zA-Z][a-zA-Z0-9_-]*)/g,
		type: 'tag',
		extract: (match) => ({
			value: match[1],
			display: `#${match[1]}`,
		}),
		metadataKey: 'tags',
	},

	// Assignee pattern: @person (like @john, @team-lead)
	{
		regex: /@([a-zA-Z][a-zA-Z0-9_-]*)/g,
		type: 'assignee',
		extract: (match) => ({
			value: match[1],
			display: `@${match[1]}`,
		}),
		metadataKey: 'assignee',
	},

	// Reference/Link pattern: [[reference]] (like [[node-id]] or [[http://...]])
	{
		regex: /\[\[([^\]]+)\]\]/g,
		type: 'reference',
		extract: (match) => ({
			value: match[1],
			display: match[1],
		}),
		metadataKey: 'reference',
	},

	// Font size pattern: size:24px
	{
		regex: /size:(\d+(?:\.\d+)?)(px|pt|em|rem)\b/gi,
		type: 'fontSize',
		extract: (match) => ({
			value: `${match[1]}${match[2]}`,
			display: `${match[1]}${match[2]}`,
		}),
		metadataKey: 'fontSize',
	},

	// Text alignment: align:left/center/right
	{
		regex: /align:(left|center|right)\b/gi,
		type: 'textAlign',
		extract: (match) => ({
			value: match[1].toLowerCase(),
			display:
				match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
		}),
		metadataKey: 'textAlign',
	},

	// Font weight pattern: weight:bold or weight:400
	{
		regex: /weight:(normal|bold|bolder|lighter|\d{3})\b/gi,
		type: 'fontWeight',
		extract: (match) => ({
			value: match[1],
			display: match[1],
		}),
		metadataKey: 'fontWeight',
	},

	// Font style pattern: style:italic or style:normal
	{
		regex: /style:(normal|italic|oblique)\b/gi,
		type: 'fontStyle',
		extract: (match) => ({
			value: match[1].toLowerCase(),
			display:
				match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
		}),
		metadataKey: 'fontStyle',
	},

	// Title pattern: title:"Text"
	{
		regex: /title:"([^"]+)"/gi,
		type: 'title',
		extract: (match) => ({
			value: match[1],
			display: match[1],
		}),
		metadataKey: 'title',
	},

	// Label pattern: label:"Text"
	{
		regex: /label:"([^"]+)"/gi,
		type: 'label',
		extract: (match) => ({
			value: match[1],
			display: match[1],
		}),
		metadataKey: 'label',
	},

	// URL pattern: url:value
	{
		regex: /url:(\S+)/gi,
		type: 'url',
		extract: (match) => ({
			value: match[1],
			display: match[1],
		}),
		metadataKey: 'url',
	},

	// Language pattern: lang:javascript
	{
		regex: /lang:(\S+)/gi,
		type: 'language',
		extract: (match) => ({
			value: match[1],
			display: match[1],
		}),
		metadataKey: 'language',
	},

	// File name pattern: file:name
	{
		regex: /file:(\S+)/gi,
		type: 'fileName',
		extract: (match) => ({
			value: match[1],
			display: match[1],
		}),
		metadataKey: 'fileName',
	},

	// Confidence pattern: confidence:85%
	{
		regex: /confidence:(\d+)%?/gi,
		type: 'confidence',
		extract: (match) => ({
			value: match[1],
			display: `${match[1]}%`,
		}),
		metadataKey: 'confidence',
	},

	// Status pattern: :status (like :done, :in-progress, :blocked)
	// IMPORTANT: Uses negative lookbehind to prevent matching when part of other patterns
	// (e.g., won't match :green in color:green, :blue in bg:blue, etc.)
	{
		regex: /(?<!color|bg|border|size|align|weight|style|title|label|url|lang|file|confidence|question|multiple|options):([a-zA-Z][a-zA-Z0-9_-]*)/g,
		type: 'status',
		extract: (match) => ({
			value: match[1],
			display: `:${match[1]}`,
		}),
		metadataKey: 'status',
	},
];

/**
 * Extract all patterns from text
 */
export function extractAllPatterns(text: string): ExtractedData {
	const patterns: ExtractedPattern[] = [];
	const metadata: Record<string, any> = {};

	// Extract patterns using configurations
	for (const config of PATTERN_CONFIGS) {
		const regex = new RegExp(config.regex);
		let match;

		while ((match = regex.exec(text)) !== null) {
			const { value, display } = config.extract(match);

			patterns.push({
				type: config.type,
				value,
				display,
				position: match.index,
				raw: match[0],
			});

			// Add to metadata
			if (config.metadataKey) {
				if (config.type === 'tag') {
					// Tags are stored as array
					if (!metadata[config.metadataKey]) {
						metadata[config.metadataKey] = [];
					}

					metadata[config.metadataKey].push(value);
				} else {
					metadata[config.metadataKey] = value;
				}
			}
		}
	}

	// Extract checkbox patterns from ORIGINAL text
	const checkboxPatterns = extractCheckboxPatterns(text);
	patterns.push(...checkboxPatterns);

	// Extract formatting patterns (bold, italic) from ORIGINAL text
	const formattingPatterns = extractFormattingPatterns(text);
	patterns.push(...formattingPatterns);

	// Build clean text by removing all pattern matches from the text
	// Sort patterns by position (descending) to remove from end to start
	const sortedPatterns = [...patterns].sort((a, b) => b.position - a.position);
	let cleanText = text;

	for (const pattern of sortedPatterns) {
		// Remove pattern from text using position
		cleanText =
			cleanText.slice(0, pattern.position) +
			cleanText.slice(pattern.position + pattern.raw.length);
	}

	// Clean up the text
	cleanText = cleanText
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim();

	return {
		cleanText,
		patterns,
		metadata,
	};
}

/**
 * Extract checkbox patterns from text
 */
function extractCheckboxPatterns(text: string): ExtractedPattern[] {
	const patterns: ExtractedPattern[] = [];
	// Match [], [ ], [x], [X] but not [[reference]] patterns
	const checkboxRegex = /\[([ xX]?)\]/g;
	let match;

	while ((match = checkboxRegex.exec(text)) !== null) {
		// Skip if this is part of a [[reference]] pattern
		const charBefore = text[match.index - 1];
		const charAfter = text[match.index + match[0].length];

		if (charBefore === '[' || charAfter === ']') {
			continue; // Skip [[...]] patterns
		}

		const checkboxContent = match[1] || '';
		const isChecked = checkboxContent.toLowerCase() === 'x';
		patterns.push({
			type: 'checkbox',
			value: isChecked ? 'checked' : 'unchecked',
			display: isChecked ? '☑' : '☐',
			position: match.index,
			raw: match[0],
		});
	}

	return patterns;
}

/**
 * Extract formatting patterns (bold, italic)
 */
function extractFormattingPatterns(text: string): ExtractedPattern[] {
	const patterns: ExtractedPattern[] = [];

	// Bold pattern: **text** or __text__
	const boldRegex = /(\*\*|__)([^*_]+)\1/g;
	let match;

	while ((match = boldRegex.exec(text)) !== null) {
		patterns.push({
			type: 'bold',
			value: match[2],
			display: match[2],
			position: match.index,
			raw: match[0],
		});
	}

	// Italic pattern: *text* or _text_
	const italicRegex = /(\*|_)([^*_]+)\1/g;

	while ((match = italicRegex.exec(text)) !== null) {
		// Skip if it's actually bold (double markers)
		if (
			!text.substr(match.index - 1, 1).match(/[*_]/) &&
			!text.substr(match.index + match[0].length, 1).match(/[*_]/)
		) {
			patterns.push({
				type: 'italic',
				value: match[2],
				display: match[2],
				position: match.index,
				raw: match[0],
			});
		}
	}

	return patterns;
}

/**
 * Parse input text for quick input mode (used by node-commands)
 * Returns structured data compatible with QuickParser type
 * Returns ALL extracted metadata - no data loss
 */
export function parseInput(input: string): {
	content: string;
	metadata: Record<string, any>;
	patterns: ExtractedPattern[];
} {
	const { cleanText, patterns, metadata } = extractAllPatterns(input);

	// Process nested metadata keys (e.g., 'responseFormat.options' -> responseFormat.options)
	const processedMetadata: Record<string, any> = {};

	for (const [key, value] of Object.entries(metadata)) {
		if (key.includes('.')) {
			// Handle nested keys like 'responseFormat.options'
			const parts = key.split('.');
			const parentKey = parts[0];
			const childKey = parts[1];

			if (!processedMetadata[parentKey]) {
				processedMetadata[parentKey] = {};
			}

			// Convert string 'true'/'false' to boolean for allowMultiple
			if (childKey === 'allowMultiple') {
				processedMetadata[parentKey][childKey] = value === 'true';
			}
			// Parse options string into array of objects
			else if (childKey === 'options') {
				processedMetadata[parentKey][childKey] = value
					.split(',')
					.map((opt: string, index: number) => ({
						id: `option-${index}`,
						label: opt.trim(),
					}));
			} else {
				processedMetadata[parentKey][childKey] = value;
			}
		} else {
			// Direct key
			processedMetadata[key] = value;
		}
	}

	// Process tasks if checkbox patterns are found
	if (hasCheckboxSyntax(input)) {
		const tasks = parseTaskList(input);
		processedMetadata.tasks = tasks;
	}

	return {
		content: cleanText,
		metadata: processedMetadata,
		patterns,
	};
}

/**
 * Parse input text into node data (alternative API)
 */
export function parseInputToNodeData(input: string): Partial<NodeData> {
	const { cleanText, metadata } = extractAllPatterns(input);

	const nodeData: Partial<NodeData> = {
		label: cleanText,
		...metadata,
	};

	// Process tasks if checkbox patterns found
	if (hasCheckboxSyntax(input)) {
		const tasks = parseTaskList(input);
		nodeData.tasks = tasks;
	}

	return nodeData;
}

/**
 * Check if text contains checkbox syntax
 */
export function hasCheckboxSyntax(text: string): boolean {
	// Check for checkbox patterns: [], [ ], [x], [X]
	// Exclude [[reference]] patterns by checking surrounding characters
	const matches = text.matchAll(/\[([ xX]?)\]/g);

	for (const match of matches) {
		const charBefore = text[match.index! - 1];
		const charAfter = text[match.index! + match[0].length];

		// If not part of [[...]], it's a checkbox
		if (charBefore !== '[' && charAfter !== ']') {
			return true;
		}
	}

	return false;
}

/**
 * Parse task list from text
 * Returns tasks with isComplete property to match TaskNode expectations
 */
export function parseTaskList(
	text: string
): Array<{ text: string; isComplete: boolean; id?: string }> {
	// Split by newlines (handle both \n and \r\n)
	const lines = text.split(/\r?\n/);
	const tasks: Array<{ text: string; isComplete: boolean; id?: string }> = [];

	for (const line of lines) {
		// Simpler regex: Match checkbox at start of line
		// Matches: [], [ ], [x], [X] but not [[reference]]
		const match = line.match(/^\s*\[([ xX]?)\]\s*(.+)/);

		if (match) {
			const checkboxContent = match[1] || ''; // Space, x, X, or empty
			const taskText = match[2].trim();

			// Only add if there's actual task text
			if (taskText) {
				const isCompleted = checkboxContent.toLowerCase() === 'x';
				tasks.push({
					text: taskText,
					isComplete: isCompleted,
					id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				});
			}
		}
	}

	return tasks;
}

/**
 * Check if text has embedded patterns
 */
export function hasEmbeddedPatterns(text: string): boolean {
	for (const config of PATTERN_CONFIGS) {
		if (config.regex.test(text)) {
			return true;
		}
	}

	return hasCheckboxSyntax(text);
}

/**
 * Count tasks in text
 */
export function countTasks(text: string): number {
	// Match [], [ ], [x], [X] but not [[reference]] patterns
	const matches = text.match(/(?<!\[)\[([ xX]?)\](?!\])/g);
	return matches ? matches.length : 0;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		// Try with protocol
		try {
			new URL(`https://${url}`);
			return true;
		} catch {
			return false;
		}
	}
}
