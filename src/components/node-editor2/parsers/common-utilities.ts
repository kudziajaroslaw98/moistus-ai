/**
 * Common utilities used across all parsers
 * Shared pattern detection, formatting, and extraction logic
 */

import { parseDateString, formatDateForDisplay as formatDateDisplay } from './date-parser';

// Pattern types supported by the completion system
export type PatternType = 'date' | 'priority' | 'color' | 'tag' | 'assignee' | 'checkbox';

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
	const namedColors: Record<string, string> = {
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
		grey: '#808080'
	};
	
	const normalized = color.toLowerCase();
	if (namedColors[normalized]) {
		return namedColors[normalized];
	}
	
	return color;
};

/**
 * Format date for display with relative descriptions
 * Returns human-friendly date strings like "Today", "Tomorrow", "In 3 days"
 */
export const formatDateForDisplay = (date: Date, original: string): string => {
	return formatDateDisplay(date, original);
};

/**
 * Format priority values for display with emoji indicators
 */
export const formatPriorityForDisplay = (priority: string): string => {
	switch (priority.toLowerCase()) {
		case 'critical': return '🔴 Critical';
		case 'high': return '🔴 High';
		case 'medium': return '🟡 Medium';
		case 'low': return '🟢 Low';
		case 'urgent': return '⚡ Urgent';
		case 'asap': return '🚨 ASAP';
		case 'blocked': return '⛔ Blocked';
		case 'waiting': return '⏳ Waiting';
		default: return priority.charAt(0).toUpperCase() + priority.slice(1);
	}
};

/**
 * Extract all embedded patterns from text
 * Parses @dates, #priority, [tags], +assignee, color:value patterns
 */
export const parseEmbeddedPatterns = (text: string): { 
	cleanText: string; 
	patterns: Array<{type: PatternType, value: string, display: string, position: number}> 
} => {
	if (!text || typeof text !== 'string') {
		return { cleanText: text || '', patterns: [] };
	}
	
	const patterns: Array<{type: PatternType, value: string, display: string, position: number}> = [];
	let cleanText = text;
	
	// Define pattern matchers with their type information
	const patternMatchers = [
		// Date patterns (@date) - must come first to avoid conflicts
		{
			regex: /@([^@\s#\[\]+]+)/g,
			type: 'date' as PatternType,
			extract: (match: RegExpExecArray) => {
				const dateStr = match[1];
				const parsedDate = parseDateString(dateStr);
				return {
					value: dateStr,
					display: parsedDate ? formatDateForDisplay(parsedDate, dateStr) : dateStr
				};
			}
		},
		// Priority patterns (#priority)
		{
			regex: /#([^#\s@\[\]+:]+)/g,
			type: 'priority' as PatternType,
			extract: (match: RegExpExecArray) => {
				const priority = match[1].toLowerCase();
				return {
					value: priority,
					display: formatPriorityForDisplay(priority)
				};
			}
		},
		// Color patterns (color:value) - must be before general text patterns
		{
			regex: /color:([^\s@\[\]]+)/g,
			type: 'color' as PatternType,
			extract: (match: RegExpExecArray) => {
				const colorValue = match[1];
				return {
					value: colorValue,
					display: formatColorForDisplay(colorValue)
				};
			}
		},
		// Tag patterns ([tag]) - Enhanced to handle comma-separated tags, but exclude checkbox patterns
		{
			regex: /\[([^\[\]@#+:]+)\]/g,
			type: 'tag' as PatternType,
			extract: (match: RegExpExecArray) => {
				const tagContent = match[1].trim();
				
				// Exclude checkbox patterns from being treated as tags
				// Check if it's a checkbox pattern (empty, x, X, semicolon, comma, or just whitespace)
				if (/^[xX;,\s]*$/.test(tagContent)) {
					return null; // Skip this match - it's a checkbox, not a tag
				}
				
				// For comma-separated tags, preserve the original comma-separated string as the value
				return {
					value: tagContent,
					display: tagContent
				};
			}
		},
		// Assignee patterns (+assignee)
		{
			regex: /\+([^+\s@#\[\]:]+)/g,
			type: 'assignee' as PatternType,
			extract: (match: RegExpExecArray) => {
				const assignee = match[1];
				return {
					value: assignee,
					display: assignee
				};
			}
		}
	];
	
	// Extract all patterns with their positions
	const allMatches: Array<{match: RegExpExecArray, type: PatternType, extractFn: (match: RegExpExecArray) => {value: string, display: string} | null}> = [];
	
	patternMatchers.forEach(matcher => {
		matcher.regex.lastIndex = 0; // Reset regex state
		let match;
		while ((match = matcher.regex.exec(text)) !== null) {
			allMatches.push({
				match,
				type: matcher.type,
				extractFn: matcher.extract
			});
			// Prevent infinite loop
			if (matcher.regex.lastIndex === match.index) {
				matcher.regex.lastIndex++;
			}
		}
	});
	
	// Sort matches by position (descending) to replace from end to start
	allMatches.sort((a, b) => b.match.index - a.match.index);
	
	// Extract patterns and clean text
	for (const { match, type, extractFn } of allMatches) {
		const extracted = extractFn(match);
		if (extracted) {
			patterns.unshift({
				type,
				value: extracted.value,
				display: extracted.display,
				position: match.index
			});
			
			// Remove the pattern from clean text
			cleanText = cleanText.slice(0, match.index) + cleanText.slice(match.index + match[0].length);
		}
	}
	
	// Clean up extra whitespace
	cleanText = cleanText.replace(/\s+/g, ' ').trim();
	
	return { cleanText, patterns };
};

/**
 * Check if a string contains any embedded patterns
 */
export const hasEmbeddedPatterns = (text: string): boolean => {
	const result = parseEmbeddedPatterns(text);
	return result.patterns.length > 0;
};

/**
 * Extract only patterns of a specific type from text
 */
export const extractPatternsByType = (text: string, patternType: PatternType): Array<{value: string, display: string, position: number}> => {
	const result = parseEmbeddedPatterns(text);
	return result.patterns.filter(pattern => pattern.type === patternType);
};