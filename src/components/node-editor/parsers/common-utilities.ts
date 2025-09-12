/**
 * Universal Parser - Single Source of Truth for All Node Parsing
 *
 * This file contains ALL parsing logic for every node type.
 * Universal metadata principle: ALL patterns work in ALL node types.
 *
 * Key Functions:
 * - parseInput: Main function to parse any input for any node type
 * - extractAllPatterns: Extract all patterns from text
 * - Date parsing utilities
 * - Pattern validation utilities
 */

import { nanoid } from 'nanoid';
import type { NodeData } from '@/types/node-data';

// ============================================================================
// PATTERN TYPE DEFINITIONS
// ============================================================================

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
	| 'borderColor'
	| 'title'
	| 'label'
	| 'showBackground'
	| 'isCollapsed'
	| 'imageUrl'
	| 'altText'
	| 'caption'
	| 'source'
	| 'showCaption'
	| 'url'
	| 'thumbnailUrl'
	| 'showThumbnail'
	| 'language'
	| 'fileName'
	| 'showLineNumbers'
	| 'annotationType'
	| 'answer'
	| 'summary'
	| 'showSummary'
	| 'resourceType'
	| 'groupId'
	| 'groupPadding'
	| 'targetNodeId'
	| 'targetMapId'
	| 'confidence'
	| 'isAiGenerated'
	| 'bold'
	| 'italic'
	| 'alignment'
	| 'codeBlock'
	| 'imageAlt'
	| 'imageCaption'
	| 'resourceTitle'
	| 'resourceDescription'
	| 'status';

interface ExtractedPattern {
	type: PatternType;
	value: string;
	display: string;
	position: number;
}

export interface ExtractedData {
	cleanText: string;
	patterns: ExtractedPattern[];

	// ==========================================
	// Universal Common Metadata
	// ==========================================
	assignee?: string;
	priority?: string;
	date?: string;
	tags?: string[];
	status?: string;

	// ==========================================
	// Text Formatting Metadata
	// ==========================================
	fontSize?: string;
	fontWeight?: string;
	fontStyle?: 'italic' | 'normal';
	textAlign?: 'left' | 'center' | 'right';
	textColor?: string;

	// ==========================================
	// Display & Layout Metadata
	// ==========================================
	backgroundColor?: string;
	borderColor?: string;
	title?: string;
	label?: string;
	showBackground?: boolean;
	isCollapsed?: boolean;

	// ==========================================
	// Media Metadata
	// ==========================================
	imageUrl?: string;
	altText?: string;
	caption?: string;
	source?: string;
	showCaption?: boolean;
	url?: string;
	thumbnailUrl?: string;
	showThumbnail?: boolean;

	// ==========================================
	// Code Metadata
	// ==========================================
	language?: string;
	fileName?: string;
	showLineNumbers?: boolean;

	// ==========================================
	// Node-specific Metadata
	// ==========================================
	annotationType?: string;
	answer?: string;
	summary?: string;
	showSummary?: boolean;
	resourceType?: string;

	// ==========================================
	// Group Metadata
	// ==========================================
	groupId?: string;
	groupPadding?: number;

	// ==========================================
	// Reference Metadata
	// ==========================================
	targetNodeId?: string;
	targetMapId?: string;
	confidence?: number;
	isAiGenerated?: boolean;

	// ==========================================
	// Legacy/Backward Compatibility
	// ==========================================
	color?: string; // Legacy text color field
	bold?: boolean;
	italic?: boolean;
	alignment?: 'left' | 'center' | 'right';

	// ==========================================
	// Structural Elements
	// ==========================================
	checkboxes?: Array<{ id: string; text: string; isComplete: boolean }>;
	codeLanguage?: string;
	codeContent?: string;
	imageAlt?: string; // Legacy field
	imageCaption?: string; // Legacy field
	resourceUrl?: string; // Legacy field
	resourceTitle?: string; // Legacy field
	resourceDescription?: string; // Legacy field
}

// ============================================================================
// ALL PATTERN DEFINITIONS - CONSOLIDATED
// ============================================================================

const PATTERNS = {
	// ==========================================
	// Universal Common Metadata Patterns - work in ALL nodes
	// ==========================================
	date: {
		regex: /\^([^\^\s#\[\]+]+)/g,
		type: 'date' as PatternType,
	},

	priority: {
		regex: /#([^#\s@\[\]+:]+)/g,
		type: 'priority' as PatternType,
	},

	assignee: {
		regex: /@([^@\s#\[\]:]+)/g,
		type: 'assignee' as PatternType,
	},

	tags: {
		regex: /\[([^\[\]@#+:]+)\]/g,
		type: 'tag' as PatternType,
		// Exclude checkbox patterns (empty, x, X, semicolon, comma, or just whitespace)
		exclusionPattern: /^[xX;,\s]*$/,
	},

	status: {
		regex: /!([^!\s@\[\]:]+)/g,
		type: 'status' as PatternType,
	},

	// ==========================================
	// Text Formatting Patterns - work in ALL nodes
	// ==========================================
	fontSize: {
		regex: /~([^\s~@\[\]]+)/g,
		type: 'fontSize' as PatternType,
	},

	fontWeight: {
		regex: /\*([^*\s@\[\]:]+)/g,
		type: 'fontWeight' as PatternType,
		exclude: /^\*\*/,  // Exclude markdown bold markers
	},

	fontStyle: {
		regex: /\/italic/g,
		type: 'fontStyle' as PatternType,
	},

	textAlign: {
		regex: />([^>\s@\[\]:]+)/g,
		type: 'textAlign' as PatternType,
	},

	textColor: {
		regex: /color:([^\s@\[\]]+)/g,
		type: 'color' as PatternType,
	},

	// ==========================================
	// Display & Layout Patterns - work in ALL nodes
	// ==========================================
	backgroundColor: {
		regex: /bg:([^\s@\[\]]+)/g,
		type: 'backgroundColor' as PatternType,
	},

	borderColor: {
		regex: /border:([^\s@\[\]]+)/g,
		type: 'borderColor' as PatternType,
	},

	title: {
		regex: /title:"([^"]+)"/g,
		type: 'title' as PatternType,
	},

	label: {
		regex: /label:"([^"]+)"/g,
		type: 'label' as PatternType,
	},

	showBackground: {
		regex: /showbg:(on|off)/g,
		type: 'showBackground' as PatternType,
	},

	isCollapsed: {
		regex: /collapsed:(on|off)/g,
		type: 'isCollapsed' as PatternType,
	},

	// ==========================================
	// Media Patterns - work in ALL nodes
	// ==========================================
	imageUrl: {
		regex: /img:([^\s@\[\]]+)/g,
		type: 'imageUrl' as PatternType,
	},

	altText: {
		regex: /alt:"([^"]+)"/g,
		type: 'altText' as PatternType,
	},

	caption: {
		regex: /cap:"([^"]+)"/g,
		type: 'caption' as PatternType,
	},

	source: {
		regex: /src:"([^"]+)"/g,
		type: 'source' as PatternType,
	},

	showCaption: {
		regex: /showcap:(on|off)/g,
		type: 'showCaption' as PatternType,
	},

	url: {
		regex: /url:([^\s@\[\]]+)/g,
		type: 'url' as PatternType,
	},

	thumbnailUrl: {
		regex: /thumb:([^\s@\[\]]+)/g,
		type: 'thumbnailUrl' as PatternType,
	},

	showThumbnail: {
		regex: /showthumb:(on|off)/g,
		type: 'showThumbnail' as PatternType,
	},

	// ==========================================
	// Code Patterns - work in ALL nodes
	// ==========================================
	language: {
		regex: /lang:([^\s@\[\]]+)/g,
		type: 'language' as PatternType,
	},

	fileName: {
		regex: /file:([^\s@\[\]]+)/g,
		type: 'fileName' as PatternType,
	},

	showLineNumbers: {
		regex: /lines:(on|off)/g,
		type: 'showLineNumbers' as PatternType,
	},

	// ==========================================
	// Node-specific Patterns
	// ==========================================
	annotationType: {
		regex: /type:([^\s@\[\]:]+)/g,
		type: 'annotationType' as PatternType,
	},

	answer: {
		regex: /answer:"([^"]+)"/g,
		type: 'answer' as PatternType,
	},

	summary: {
		regex: /summary:"([^"]+)"/g,
		type: 'summary' as PatternType,
	},

	showSummary: {
		regex: /showsummary:(on|off)/g,
		type: 'showSummary' as PatternType,
	},

	resourceType: {
		regex: /restype:([^\s@\[\]:]+)/g,
		type: 'resourceType' as PatternType,
	},

	// ==========================================
	// Group Patterns
	// ==========================================
	groupId: {
		regex: /groupid:([^\s@\[\]]+)/g,
		type: 'groupId' as PatternType,
	},

	groupPadding: {
		regex: /padding:([^\s@\[\]]+)/g,
		type: 'groupPadding' as PatternType,
	},

	// ==========================================
	// Reference Patterns
	// ==========================================
	targetNodeId: {
		regex: /target:([^\s@\[\]]+)/g,
		type: 'targetNodeId' as PatternType,
	},

	targetMapId: {
		regex: /targetmap:([^\s@\[\]]+)/g,
		type: 'targetMapId' as PatternType,
	},

	confidence: {
		regex: /confidence:([^\s@\[\]]+)/g,
		type: 'confidence' as PatternType,
	},

	isAiGenerated: {
		regex: /ai:true/g,
		type: 'isAiGenerated' as PatternType,
	},

	// ==========================================
	// Legacy/Backward Compatibility Patterns
	// ==========================================
	bold: {
		regex: /\*\*(.*?)\*\*/g,
		type: 'bold' as PatternType,
	},

	italic: {
		regex: /(?<!\*)\*([^*]+)\*(?!\*)|(?<![_])\b_([^_]+)_\b(?![_])/g,
		type: 'italic' as PatternType,
	},

	alignment: {
		regex: /align:(left|center|right)/i,
		type: 'alignment' as PatternType,
	},

	// Task patterns - work in ALL nodes
	checkbox: {
		regex: /^\s*(?:[-*]\s*)?\[([xX;,\s]*)\]\s*(.*)$/,
		type: 'checkbox' as PatternType,
		isComplete: /[xX;,]/,
	},

	// Code patterns - work in ALL nodes
	codeBlock: {
		regex: /```(\w+)?\s*([\s\S]*?)```/g,
		type: 'codeBlock' as PatternType,
	},

	filePattern: {
		regex: /(\w+)\s+file:(\S+)/g,
		type: 'codeBlock' as PatternType,
	},

	// Image patterns - work in ALL nodes
	imageAlt: {
		regex: /^(.+?)\s+"([^"]+)"$/,
		type: 'imageAlt' as PatternType,
	},

	imageCaption: {
		regex: /^(.+?)\s+cap:(.+)$/i,
		type: 'imageCaption' as PatternType,
	},

	// Resource patterns - work in ALL nodes
	resourceTitle: {
		regex: /^(.+?)\s+"([^"]+)"$/,
		type: 'resourceTitle' as PatternType,
	},

	resourceDescription: {
		regex: /^(.+?)\s+desc:(.+)$/i,
		type: 'resourceDescription' as PatternType,
	},
} as const;

// ============================================================================
// DATE PARSING UTILITIES - FROM date-parser.ts
// ============================================================================

/**
 * Parse date strings including natural language dates
 * Supports: today, tomorrow, yesterday, weekday names, ISO dates
 */
export const parseDateString = (dateStr: string): Date | undefined => {
	const lowerDate = dateStr.toLowerCase();
	const today = new Date();
	today.setHours(0, 0, 0, 0);

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
		default:
			// Try parsing weekday names
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

			// Try parsing as a date
			const parsed = new Date(dateStr);
			return isNaN(parsed.getTime()) ? undefined : parsed;
	}
};

/**
 * Format date for display with relative descriptions
 * Returns human-friendly date strings like "Today", "Tomorrow", "In 3 days"
 */
export const formatDateForDisplay = (date: Date, original: string): string => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const targetDate = new Date(date);
	targetDate.setHours(0, 0, 0, 0);

	const diffTime = targetDate.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Tomorrow';
	if (diffDays === -1) return 'Yesterday';
	if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
	if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

	// For named dates like 'monday', 'friday', etc., keep original if it's a weekday name
	const weekdays = [
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
	];

	if (weekdays.includes(original.toLowerCase())) {
		return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
	}

	// Default to formatted date
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
	});
};

// ============================================================================
// COLOR AND PRIORITY FORMATTING UTILITIES - FROM patterns.ts
// ============================================================================

/**
 * Named colors to hex conversion
 */
export const NAMED_COLORS: Record<string, string> = {
	red: '#FF0000',
	blue: '#0000FF',
	green: '#008000',
	yellow: '#FFFF00',
	orange: '#FFA500',
	purple: '#800080',
	pink: '#FFC0CB',
	black: '#000000',
	white: '#FFFFFF',
	gray: '#808080',
	grey: '#808080',
} as const;

/**
 * Format color values for display
 * Converts named colors to hex and normalizes format
 */
export const formatColorForDisplay = (color: string): string => {
	// Handle hex colors
	if (color.startsWith('#')) {
		return color.toUpperCase();
	}

	// Handle RGB/RGBA colors
	if (color.startsWith('rgb')) {
		return color;
	}

	// Handle named colors
	const normalized = color.toLowerCase();

	if (NAMED_COLORS[normalized]) {
		return NAMED_COLORS[normalized];
	}

	return color;
};

/**
 * Priority display formatting
 */
export const PRIORITY_DISPLAY_MAP: Record<string, string> = {
	critical: '🔴 Critical',
	high: '🔴 High',
	medium: '🟡 Medium',
	low: '🟢 Low',
	urgent: '⚡ Urgent',
	asap: '🚨 ASAP',
	blocked: '⛔ Blocked',
	waiting: '⏳ Waiting',
} as const;

/**
 * Format priority values for display with emoji indicators
 */
export const formatPriorityForDisplay = (priority: string): string => {
	const formatted = PRIORITY_DISPLAY_MAP[priority.toLowerCase()];
	if (formatted) return formatted;
	return priority.charAt(0).toUpperCase() + priority.slice(1);
};

// ============================================================================
// LANGUAGE DETECTION FOR CODE - FROM media-parsers.ts
// ============================================================================

/**
 * Language detection patterns for code
 */
const LANGUAGE_PATTERNS: Array<[RegExp, string]> = [
	[/\b(const|let|var|function|=>|async|await)\b/, 'javascript'],
	[/\b(interface|type|namespace|enum)\b/, 'typescript'],
	[/\b(def|import|from|class|if __name__)\b/, 'python'],
	[/\b(public|private|class|void|int|String)\b/, 'java'],
	[/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/i, 'sql'],
	[/<[a-zA-Z]+.*?>.*?<\/[a-zA-Z]+>/, 'html'],
	[/\{[\s\S]*:\s*[\s\S]*\}/, 'json'],
];

/**
 * Auto-detect programming language from code content
 */
export const detectLanguage = (code: string): string => {
	for (const [pattern, language] of LANGUAGE_PATTERNS) {
		if (pattern.test(code)) {
			return language;
		}
	}

	return 'plaintext';
};

// ============================================================================
// PATTERN EXTRACTION ENGINE
// ============================================================================

/**
 * Extract all patterns from text - Universal pattern extraction
 * This function finds ALL possible patterns in the text and returns them
 */
export const extractAllPatterns = (text: string): ExtractedData => {
	if (!text || typeof text !== 'string') {
		return { cleanText: text || '', patterns: [] };
	}

	const patterns: ExtractedPattern[] = [];
	let cleanText = text;
	const extractedData: ExtractedData = { cleanText, patterns };

	// Process each pattern type

	// 1. Handle checkboxes first (multiline)
	const lines = text.split('\n');
	const checkboxes: Array<{ id: string; text: string; isComplete: boolean }> = [];
	let hasCheckboxes = false;

	for (const line of lines) {
		const checkboxMatch = PATTERNS.checkbox.regex.exec(line.trim());

		if (checkboxMatch) {
			hasCheckboxes = true;
			const checkboxChar = checkboxMatch[1] || '';
			const isComplete = PATTERNS.checkbox.isComplete.test(checkboxChar);
			const taskText = checkboxMatch[2].trim();

			checkboxes.push({
				id: nanoid(),
				text: taskText,
				isComplete,
			});

			// Remove checkbox line from clean text
			cleanText = cleanText.replace(line, '');
		}
	}

	if (hasCheckboxes) {
		extractedData.checkboxes = checkboxes;
	}

	// 2. Handle code blocks
	PATTERNS.codeBlock.regex.lastIndex = 0;
	let codeMatch;

	while ((codeMatch = PATTERNS.codeBlock.regex.exec(cleanText)) !== null) {
		const language = codeMatch[1] || detectLanguage(codeMatch[2]);
		const codeContent = codeMatch[2].trim();

		extractedData.codeLanguage = language;
		extractedData.codeContent = codeContent;

		patterns.push({
			type: 'codeBlock',
			value: language,
			display: `Code (${language})`,
			position: codeMatch.index,
		});

		// Remove code block from clean text
		cleanText = cleanText.replace(codeMatch[0], '');
	}

	// 3. Handle file patterns
	PATTERNS.filePattern.regex.lastIndex = 0;
	let fileMatch;

	while ((fileMatch = PATTERNS.filePattern.regex.exec(cleanText)) !== null) {
		const language = fileMatch[1];
		const fileName = fileMatch[2];

		extractedData.codeLanguage = language;
		extractedData.fileName = fileName;

		patterns.push({
			type: 'codeBlock',
			value: language,
			display: `${fileName} (${language})`,
			position: fileMatch.index,
		});

		// Remove file pattern from clean text
		cleanText = cleanText.replace(fileMatch[0], '');
	}

	// 4. Handle embedded metadata patterns
	const metadataPatterns = [
		// ==========================================
		// Universal Common Metadata Patterns
		// ==========================================
		{
			pattern: PATTERNS.date,
			extract: (match: RegExpExecArray) => {
				const dateStr = match[1];
				const parsedDate = parseDateString(dateStr);
				extractedData.date = dateStr;
				return {
					value: dateStr,
					display: parsedDate
						? formatDateForDisplay(parsedDate, dateStr)
						: dateStr,
				};
			},
		},

		{
			pattern: PATTERNS.priority,
			extract: (match: RegExpExecArray) => {
				const priority = match[1].toLowerCase();
				extractedData.priority = priority;
				return {
					value: priority,
					display: formatPriorityForDisplay(priority),
				};
			},
		},

		{
			pattern: PATTERNS.assignee,
			extract: (match: RegExpExecArray) => {
				const assignee = match[1];
				extractedData.assignee = assignee;
				return {
					value: assignee,
					display: `@${assignee}`,
				};
			},
		},

		{
			pattern: PATTERNS.status,
			extract: (match: RegExpExecArray) => {
				const status = match[1].toLowerCase();
				extractedData.status = status;
				return {
					value: status,
					display: `!${status}`,
				};
			},
		},

		{
			pattern: PATTERNS.tags,
			extract: (match: RegExpExecArray) => {
				const tagContent = match[1].trim();

				// Exclude checkbox patterns
				if (PATTERNS.tags.exclusionPattern.test(tagContent)) {
					return null;
				}

				// Handle comma-separated tags
				const tags = tagContent
					.split(',')
					.map((t) => t.trim())
					.filter((t) => t.length > 0);
				if (!extractedData.tags) extractedData.tags = [];
				extractedData.tags.push(...tags);

				return {
					value: tagContent,
					display: `[${tagContent}]`,
				};
			},
		},

		// ==========================================
		// Text Formatting Patterns
		// ==========================================
		{
			pattern: PATTERNS.fontSize,
			extract: (match: RegExpExecArray) => {
				const fontSize = match[1];
				extractedData.fontSize = fontSize;
				return {
					value: fontSize,
					display: `~${fontSize}`,
				};
			},
		},

		{
			pattern: PATTERNS.fontWeight,
			extract: (match: RegExpExecArray) => {
				// Skip if this looks like markdown bold
				const fullMatch = match[0];
				if (fullMatch.startsWith('**')) return null;
				
				const fontWeight = match[1];
				extractedData.fontWeight = fontWeight;
				return {
					value: fontWeight,
					display: `*${fontWeight}`,
				};
			},
		},

		{
			pattern: PATTERNS.fontStyle,
			extract: (match: RegExpExecArray) => {
				extractedData.fontStyle = 'italic';
				return {
					value: 'italic',
					display: '/italic',
				};
			},
		},

		{
			pattern: PATTERNS.textAlign,
			extract: (match: RegExpExecArray) => {
				const align = match[1] as 'left' | 'center' | 'right';
				extractedData.textAlign = align;
				return {
					value: align,
					display: `>${align}`,
				};
			},
		},

		{
			pattern: PATTERNS.textColor,
			extract: (match: RegExpExecArray) => {
				const color = match[1];
				extractedData.textColor = color;
				extractedData.color = color; // Backward compatibility
				return {
					value: color,
					display: `color:${color}`,
				};
			},
		},

		// ==========================================
		// Display & Layout Patterns
		// ==========================================
		{
			pattern: PATTERNS.backgroundColor,
			extract: (match: RegExpExecArray) => {
				const bg = match[1];
				extractedData.backgroundColor = bg;
				return {
					value: bg,
					display: `bg:${bg}`,
				};
			},
		},

		{
			pattern: PATTERNS.borderColor,
			extract: (match: RegExpExecArray) => {
				const border = match[1];
				extractedData.borderColor = border;
				return {
					value: border,
					display: `border:${border}`,
				};
			},
		},

		{
			pattern: PATTERNS.title,
			extract: (match: RegExpExecArray) => {
				const title = match[1];
				extractedData.title = title;
				return {
					value: title,
					display: `title:"${title}"`,
				};
			},
		},

		{
			pattern: PATTERNS.label,
			extract: (match: RegExpExecArray) => {
				const label = match[1];
				extractedData.label = label;
				return {
					value: label,
					display: `label:"${label}"`,
				};
			},
		},

		{
			pattern: PATTERNS.showBackground,
			extract: (match: RegExpExecArray) => {
				const show = match[1] === 'on';
				extractedData.showBackground = show;
				return {
					value: show.toString(),
					display: `showbg:${match[1]}`,
				};
			},
		},

		{
			pattern: PATTERNS.isCollapsed,
			extract: (match: RegExpExecArray) => {
				const collapsed = match[1] === 'on';
				extractedData.isCollapsed = collapsed;
				return {
					value: collapsed.toString(),
					display: `collapsed:${match[1]}`,
				};
			},
		},

		// ==========================================
		// Media Patterns
		// ==========================================
		{
			pattern: PATTERNS.imageUrl,
			extract: (match: RegExpExecArray) => {
				const url = match[1];
				extractedData.imageUrl = url;
				return {
					value: url,
					display: `img:${url}`,
				};
			},
		},

		{
			pattern: PATTERNS.altText,
			extract: (match: RegExpExecArray) => {
				const alt = match[1];
				extractedData.altText = alt;
				extractedData.imageAlt = alt; // Backward compatibility
				return {
					value: alt,
					display: `alt:"${alt}"`,
				};
			},
		},

		{
			pattern: PATTERNS.caption,
			extract: (match: RegExpExecArray) => {
				const cap = match[1];
				extractedData.caption = cap;
				extractedData.imageCaption = cap; // Backward compatibility
				return {
					value: cap,
					display: `cap:"${cap}"`,
				};
			},
		},

		{
			pattern: PATTERNS.source,
			extract: (match: RegExpExecArray) => {
				const src = match[1];
				extractedData.source = src;
				return {
					value: src,
					display: `src:"${src}"`,
				};
			},
		},

		{
			pattern: PATTERNS.url,
			extract: (match: RegExpExecArray) => {
				const url = match[1];
				extractedData.url = url;
				extractedData.resourceUrl = url; // Backward compatibility
				return {
					value: url,
					display: `url:${url}`,
				};
			},
		},

		// ==========================================
		// Code Patterns
		// ==========================================
		{
			pattern: PATTERNS.language,
			extract: (match: RegExpExecArray) => {
				const lang = match[1];
				extractedData.language = lang;
				extractedData.codeLanguage = lang; // Backward compatibility
				return {
					value: lang,
					display: `lang:${lang}`,
				};
			},
		},

		{
			pattern: PATTERNS.fileName,
			extract: (match: RegExpExecArray) => {
				const file = match[1];
				extractedData.fileName = file;
				return {
					value: file,
					display: `file:${file}`,
				};
			},
		},

		{
			pattern: PATTERNS.showLineNumbers,
			extract: (match: RegExpExecArray) => {
				const show = match[1] === 'on';
				extractedData.showLineNumbers = show;
				return {
					value: show.toString(),
					display: `lines:${match[1]}`,
				};
			},
		},

		// ==========================================
		// Node-specific Patterns
		// ==========================================
		{
			pattern: PATTERNS.annotationType,
			extract: (match: RegExpExecArray) => {
				const type = match[1];
				extractedData.annotationType = type;
				return {
					value: type,
					display: `type:${type}`,
				};
			},
		},

		{
			pattern: PATTERNS.answer,
			extract: (match: RegExpExecArray) => {
				const answer = match[1];
				extractedData.answer = answer;
				return {
					value: answer,
					display: `answer:"${answer}"`,
				};
			},
		},

		{
			pattern: PATTERNS.summary,
			extract: (match: RegExpExecArray) => {
				const summary = match[1];
				extractedData.summary = summary;
				return {
					value: summary,
					display: `summary:"${summary}"`,
				};
			},
		},

		// ==========================================
		// Group Patterns
		// ==========================================
		{
			pattern: PATTERNS.groupId,
			extract: (match: RegExpExecArray) => {
				const groupId = match[1];
				extractedData.groupId = groupId;
				return {
					value: groupId,
					display: `groupid:${groupId}`,
				};
			},
		},

		{
			pattern: PATTERNS.groupPadding,
			extract: (match: RegExpExecArray) => {
				const padding = parseInt(match[1], 10);
				extractedData.groupPadding = padding;
				return {
					value: padding.toString(),
					display: `padding:${padding}`,
				};
			},
		},

		// ==========================================
		// Reference Patterns
		// ==========================================
		{
			pattern: PATTERNS.targetNodeId,
			extract: (match: RegExpExecArray) => {
				const target = match[1];
				extractedData.targetNodeId = target;
				return {
					value: target,
					display: `target:${target}`,
				};
			},
		},

		{
			pattern: PATTERNS.confidence,
			extract: (match: RegExpExecArray) => {
				const conf = parseFloat(match[1]);
				extractedData.confidence = conf;
				return {
					value: conf.toString(),
					display: `confidence:${conf}`,
				};
			},
		},

		{
			pattern: PATTERNS.isAiGenerated,
			extract: (match: RegExpExecArray) => {
				extractedData.isAiGenerated = true;
				return {
					value: 'true',
					display: 'ai:true',
				};
			},
		},
	];

	// Extract metadata patterns
	for (const { pattern, extract } of metadataPatterns) {
		pattern.regex.lastIndex = 0;
		let match;

		while ((match = pattern.regex.exec(cleanText)) !== null) {
			const extracted = extract(match);

			if (extracted) {
				patterns.push({
					type: pattern.type,
					value: extracted.value,
					display: extracted.display,
					position: match.index,
				});

				// Remove pattern from clean text
				cleanText = cleanText.replace(match[0], '');
			}
		}
	}

	// 5. Handle text formatting patterns
	const formatPatterns = [
		{
			pattern: PATTERNS.fontSize,
			extract: (match: RegExpExecArray) => {
				const size = match[1];
				const unit = match[2] || 'px';
				const fontSize = `${size}${unit}`;
				extractedData.fontSize = fontSize;
				return { value: fontSize, display: `Font size: ${fontSize}` };
			},
		},

		{
			pattern: PATTERNS.bold,
			extract: (match: RegExpExecArray) => {
				extractedData.bold = true;
				return { value: 'bold', display: 'Bold text' };
			},
		},

		{
			pattern: PATTERNS.italic,
			extract: (match: RegExpExecArray) => {
				extractedData.italic = true;
				return { value: 'italic', display: 'Italic text' };
			},
		},

		{
			pattern: PATTERNS.alignment,
			extract: (match: RegExpExecArray) => {
				const alignment = match[1].toLowerCase() as 'left' | 'center' | 'right';
				extractedData.alignment = alignment;
				return { value: alignment, display: `Align: ${alignment}` };
			},
		},
	];

	// Extract formatting patterns
	for (const { pattern, extract } of formatPatterns) {
		pattern.regex.lastIndex = 0;
		let match;

		while ((match = pattern.regex.exec(cleanText)) !== null) {
			const extracted = extract(match);

			if (extracted) {
				patterns.push({
					type: pattern.type,
					value: extracted.value,
					display: extracted.display,
					position: match.index,
				});

				// Remove pattern from clean text (except for bold/italic content)
				if (pattern.type === 'bold') {
					cleanText = cleanText.replace(match[0], match[1]); // Keep content, remove **
				} else if (pattern.type === 'italic') {
					cleanText = cleanText.replace(match[0], match[1] || match[2]); // Keep content, remove * or _
				} else {
					cleanText = cleanText.replace(match[0], '');
				}
			}
		}
	}

	// Clean up extra whitespace
	cleanText = cleanText
		.replace(/\s+/g, ' ')
		.replace(/\n\s*\n/g, '\n')
		.trim();

	extractedData.cleanText = cleanText;
	extractedData.patterns = patterns.sort((a, b) => a.position - b.position);

	return extractedData;
};

// ============================================================================
// MAIN UNIVERSAL PARSER
// ============================================================================

/**
 * Universal parser function - parses input for ANY node type
 * Returns data structure that matches NodeData interface
 * Universal metadata principle: ALL patterns work in ALL node types
 */
export const parseInput = (input: string): Partial<NodeData> => {
	if (!input || typeof input !== 'string') {
		return { content: '' };
	}

	// Extract all patterns using universal extraction
	const extracted = extractAllPatterns(input);

	// Build universal result matching NodeData structure
	const result: Partial<NodeData> = {
		// Root level content
		content: extracted.cleanText,

		// Universal metadata - available for ALL nodes
		metadata: {
			// ==========================================
			// Universal Common Metadata
			// ==========================================
			assignee: extracted.assignee ? [extracted.assignee] : undefined,
			priority: extracted.priority || undefined,
			dueDate: extracted.date
				? parseDateString(extracted.date)?.toISOString()
				: undefined,
			tags: extracted.tags && extracted.tags.length > 0
				? extracted.tags
				: undefined,
			status: extracted.status || undefined,

			// ==========================================
			// Text Formatting Metadata
			// ==========================================
			fontSize: extracted.fontSize || undefined,
			fontWeight: extracted.fontWeight || 
				(extracted.bold ? 'bold' : undefined),
			fontStyle: extracted.fontStyle || 
				(extracted.italic ? 'italic' : undefined),
			textAlign: extracted.textAlign || extracted.alignment || undefined,
			textColor: extracted.textColor || 
				(extracted.color ? formatColorForDisplay(extracted.color) : undefined),

			// ==========================================
			// Display & Layout Metadata
			// ==========================================
			backgroundColor: extracted.backgroundColor || undefined,
			borderColor: extracted.borderColor || undefined,
			title: extracted.title || undefined,
			label: extracted.label || undefined,
			showBackground: extracted.showBackground,
			isCollapsed: extracted.isCollapsed,

			// ==========================================
			// Media Metadata
			// ==========================================
			imageUrl: extracted.imageUrl || undefined,
			altText: extracted.altText || extracted.imageAlt || undefined,
			caption: extracted.caption || extracted.imageCaption || undefined,
			source: extracted.source || undefined,
			showCaption: extracted.showCaption,
			url: extracted.url || extracted.resourceUrl || undefined,
			thumbnailUrl: extracted.thumbnailUrl || undefined,
			showThumbnail: extracted.showThumbnail,

			// ==========================================
			// Code Metadata
			// ==========================================
			language: extracted.language || extracted.codeLanguage || undefined,
			fileName: extracted.fileName || undefined,
			showLineNumbers: extracted.showLineNumbers,

			// ==========================================
			// Node-specific Metadata
			// ==========================================
			annotationType: extracted.annotationType || undefined,
			answer: extracted.answer || undefined,
			summary: extracted.summary || undefined,
			showSummary: extracted.showSummary,
			resourceType: extracted.resourceType || undefined,

			// ==========================================
			// Group Metadata
			// ==========================================
			groupId: extracted.groupId || undefined,
			groupPadding: extracted.groupPadding,

			// ==========================================
			// Reference Metadata
			// ==========================================
			targetNodeId: extracted.targetNodeId || undefined,
			targetMapId: extracted.targetMapId || undefined,
			confidence: extracted.confidence,
			isAiGenerated: extracted.isAiGenerated,

			// ==========================================
			// Task Metadata - work in ALL nodes
			// ==========================================
			tasks: extracted.checkboxes || undefined,
		},
	};

	// Clean up metadata - remove undefined values
	if (result.metadata) {
		Object.keys(result.metadata).forEach((key) => {
			if (result.metadata![key as keyof typeof result.metadata] === undefined) {
				delete result.metadata![key as keyof typeof result.metadata];
			}
		});

		// Remove metadata object if empty
		if (Object.keys(result.metadata).length === 0) {
			result.metadata = undefined;
		}
	}

	return result;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if text contains any embedded patterns
 */
export const hasEmbeddedPatterns = (text: string): boolean => {
	const result = extractAllPatterns(text);
	return result.patterns.length > 0;
};

/**
 * Check if input contains checkbox syntax
 */
export const hasCheckboxSyntax = (input: string): boolean => {
	if (!input || typeof input !== 'string') return false;
	return PATTERNS.checkbox.regex.test(input.trim());
};

/**
 * Check if input looks like a URL
 */
export const isValidUrl = (input: string): boolean => {
	try {
		new URL(input);
		return true;
	} catch {
		return /^https?:\/\/|^www\./.test(input);
	}
};

/**
 * Count the number of tasks in input
 */
export const countTasks = (input: string): number => {
	if (!input || typeof input !== 'string') return 1;

	const lines = input.split('\n');
	const checkboxLines = lines.filter((line) => {
		const trimmedLine = line.trim();
		return PATTERNS.checkbox.regex.test(trimmedLine);
	});

	return Math.max(1, checkboxLines.length);
};

/**
 * Validate if a string represents a valid date
 */
export const isValidDateString = (dateStr: string): boolean => {
	return parseDateString(dateStr) !== undefined;
};

/**
 * Get the list of supported weekday names
 */
export const getWeekdays = (): string[] => {
	return [
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
	];
};

/**
 * Legacy function name for backward compatibility during transition
 * @deprecated Use parseInput instead
 */
export const parseEmbeddedPatterns = extractAllPatterns;

/**
 * Export alias for detectLanguage function (used in index.ts)
 */
export const detectLanguageFromContent = detectLanguage;

/**
 * Export alias for formatColorForDisplay function (used in index.ts)
 */
export const formatColorValue = formatColorForDisplay;
