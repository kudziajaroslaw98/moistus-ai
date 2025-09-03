/**
 * Task parser for mind map nodes
 * Handles checkbox syntax, task lists, and embedded metadata
 */

import { nanoid } from 'nanoid';
import { parseEmbeddedPatterns } from './common-utilities';
import { parseDateString } from './date-parser';
import type { ParsedTaskData } from '../types';

/**
 * Individual task interface
 */
interface ParsedTask {
	id: string;
	text: string;
	isComplete: boolean;
	patterns?: Array<{
		type: 'date' | 'priority' | 'color' | 'tag' | 'assignee';
		value: string;
		display: string;
	}>;
}

/**
 * Create a default task when input is invalid
 */
const createDefaultTask = (): ParsedTaskData => ({
	tasks: [{
		id: nanoid(),
		text: 'New task',
		isComplete: false,
		patterns: [],
	}],
});

/**
 * Extract metadata from patterns and apply to task data
 */
const extractMetadataFromPatterns = (patterns: Array<{type: string, value: string}>, result: ParsedTaskData): void => {
	for (const pattern of patterns) {
		switch (pattern.type) {
			case 'date':
				if (!result.dueDate) {
					result.dueDate = parseDateString(pattern.value);
				}
				break;
			case 'priority':
				if (!result.priority && ['low', 'medium', 'high'].includes(pattern.value)) {
					result.priority = pattern.value as 'low' | 'medium' | 'high';
				}
				break;
			case 'assignee':
				if (!result.assignee) {
					result.assignee = pattern.value;
				}
				break;
			case 'tag':
				if (!result.tags) {
					result.tags = [];
				}
				// Handle comma-separated tags in the value
				if (pattern.value.includes(',')) {
					const splitTags = pattern.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
					splitTags.forEach(tag => {
						if (!result.tags!.includes(tag)) {
							result.tags!.push(tag);
						}
					});
				} else {
					if (!result.tags.includes(pattern.value)) {
						result.tags.push(pattern.value);
					}
				}
				break;
		}
	}
};

/**
 * Parse a single checkbox line into a task
 */
const parseCheckboxLine = (line: string): ParsedTask | null => {
	const trimmedLine = line.trim();
	const markdownTaskPattern = /^\s*(?:[-*]\s*)?\[([xX;,\s]*)\]\s*(.*)$/;
	const match = markdownTaskPattern.exec(trimmedLine);
	
	if (match) {
		const checkboxChar = match[1] || '';
		const isComplete = /[xX;,]/.test(checkboxChar);
		const taskText = match[2].trim();
		
		// Parse patterns from the task text for node-level aggregation
		const parsedPatterns = parseEmbeddedPatterns(taskText);
		
		return {
			id: nanoid(),
			text: parsedPatterns.cleanText || taskText,
			isComplete,
			// Store patterns temporarily for aggregation
			_tempPatterns: parsedPatterns.patterns,
		} as ParsedTask & { _tempPatterns: any[] };
	}
	
	// Fallback for malformed lines
	return {
		id: nanoid(),
		text: trimmedLine,
		isComplete: false,
		patterns: [],
	};
};

/**
 * Parse multiple checkbox lines into tasks with aggregated metadata
 * Now handles full input including non-checkbox lines for metadata
 */
const parseMultipleCheckboxLines = (fullInput: string): ParsedTaskData => {
	const lines = fullInput.trim().split('\n');
	
	// Separate checkbox lines from metadata lines
	const checkboxLines = lines.filter(line => {
		const trimmedLine = line.trim();
		return /^\s*(?:[-*]\s*)?\[[xX;,\s]*\]\s*.+/.test(trimmedLine);
	});
	
	const metadataLines = lines.filter(line => {
		const trimmedLine = line.trim();
		// Lines that are not checkboxes but contain patterns
		return !(/^\s*(?:[-*]\s*)?\[[xX;,\s]*\]\s*.+/.test(trimmedLine)) && trimmedLine.length > 0;
	});
	
	// Parse each checkbox line
	const tasks = checkboxLines.map(line => parseCheckboxLine(line)).filter(Boolean) as (ParsedTask & { _tempPatterns?: any[] })[];
	
	// Extract patterns from both task lines and metadata lines
	const taskPatterns = tasks.flatMap(task => task._tempPatterns || []);
	const metadataPatterns = metadataLines.flatMap(line => {
		const parsed = parseEmbeddedPatterns(line);
		return parsed.patterns || [];
	});
	
	// Combine all patterns for node-level metadata
	const allPatterns = [...taskPatterns, ...metadataPatterns];
	
	// Clean up tasks to remove temporary patterns
	const cleanTasks = tasks.map(task => {
		const { _tempPatterns, ...cleanTask } = task;
		return cleanTask;
	});

	// Create result with cleaned tasks
	const result: ParsedTaskData = { tasks: cleanTasks };
	
	// Extract metadata from aggregated patterns
	extractMetadataFromPatterns(allPatterns, result);
	
	return result;
};

/**
 * Parse a single checkbox line or plain text into a task
 */
const parseSingleInput = (input: string): ParsedTaskData => {
	const trimmedInput = input.trim();
	
	// Check if it's a checkbox line
	const markdownTaskPattern = /^\s*(?:[-*]\s*)?\[([xX;,\s]*)\]\s*(.*)$/;
	const markdownMatch = markdownTaskPattern.exec(trimmedInput);
	
	if (markdownMatch) {
		const checkboxChar = markdownMatch[1] || '';
		const isComplete = /[xX;,]/.test(checkboxChar);
		const taskText = markdownMatch[2].trim();
		
		// Parse all embedded patterns from the task text
		const parsedPatterns = parseEmbeddedPatterns(taskText);
		
		const task = {
			id: nanoid(),
			text: parsedPatterns.cleanText || 'New task',
			isComplete,
		};

		const result: ParsedTaskData = {
			tasks: [task],
		};

		// Extract legacy metadata for backwards compatibility
		extractMetadataFromPatterns(parsedPatterns.patterns, result);

		return result;
	}
	
	// No checkboxes detected - treat as single task with patterns (backward compatibility)
	const parsedPatterns = parseEmbeddedPatterns(trimmedInput);
	
	const task = {
		id: nanoid(),
		text: parsedPatterns.cleanText || 'New task',
		isComplete: false,
	};

	const result: ParsedTaskData = {
		tasks: [task],
	};

	// Extract legacy metadata for backwards compatibility
	extractMetadataFromPatterns(parsedPatterns.patterns, result);

	return result;
};

/**
 * Parse task input with support for multiple checkboxes and embedded metadata
 * Supports:
 * - Single tasks with or without checkboxes
 * - Multiple checkbox lines
 * - Embedded patterns: @date, #priority, [tags], +assignee, color:value
 */
export const parseTaskInput = (input: string): ParsedTaskData => {
	if (!input || typeof input !== 'string') {
		return createDefaultTask();
	}

	const trimmedInput = input.trim();
	if (!trimmedInput) {
		return createDefaultTask();
	}

	// Check if input contains multiple checkbox lines
	const lines = trimmedInput.split('\n');
	const checkboxLines = lines.filter(line => {
		const trimmedLine = line.trim();
		return /^\s*(?:[-*]\s*)?\[[xX;,\s]*\]\s*.+/.test(trimmedLine);
	});

	if (checkboxLines.length > 1) {
		// Multiple checkbox lines detected - pass full input for metadata handling
		return parseMultipleCheckboxLines(trimmedInput);
	} else {
		// Single input (checkbox or plain text) - join lines for parsing
		// This allows metadata on separate lines while preserving checkbox recognition
		const singleLineInput = trimmedInput.replace(/\n/g, ' ');
		return parseSingleInput(singleLineInput);
	}
};

/**
 * Check if input contains checkbox syntax
 */
export const hasCheckboxSyntax = (input: string): boolean => {
	if (!input || typeof input !== 'string') return false;
	return /^\s*(?:[-*]\s*)?\[[xX;,\s]*\]\s*.+/.test(input.trim());
};

/**
 * Count the number of tasks in input
 */
export const countTasks = (input: string): number => {
	if (!input || typeof input !== 'string') return 1;
	
	const lines = input.split('\n');
	const checkboxLines = lines.filter(line => {
		const trimmedLine = line.trim();
		return /^\s*(?:[-*]\s*)?\[[xX;,\s]*\]\s*.+/.test(trimmedLine);
	});
	
	return Math.max(1, checkboxLines.length);
};