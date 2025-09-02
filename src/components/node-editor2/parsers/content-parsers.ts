/**
 * Content parsers for basic text-based nodes
 * Handles notes, text formatting, annotations, and questions
 */

import { parseEmbeddedPatterns } from './common-utilities';
import type { ParsedNoteData, ParsedTextData, ParsedAnnotationData, ParsedQuestionData } from '../types';

/**
 * Parse note input with priority and tags
 * Supports: #priority and [tags] patterns
 */
export const parseNoteInput = (input: string): ParsedNoteData => {
	const patterns = {
		priority: /#(low|medium|high)/i,
		tags: /\[([\w,\s]+)\]/g,
	};

	let content = input;
	const metadata: Partial<ParsedNoteData> = {};

	// Extract priority
	const priorityMatch = patterns.priority.exec(input);
	if (priorityMatch) {
		metadata.priority = priorityMatch[1].toLowerCase() as 'low' | 'medium' | 'high';
		content = content.replace(patterns.priority, '');
	}

	// Extract tags
	const tags: string[] = [];
	let tagMatch;
	while ((tagMatch = patterns.tags.exec(input)) !== null) {
		tags.push(...tagMatch[1].split(',').map((t) => t.trim()));
	}

	if (tags.length > 0) {
		metadata.tags = tags;
		content = content.replace(patterns.tags, '');
	}

	return {
		content: content.trim(),
		...metadata,
	};
};

/**
 * Parse text input with formatting options
 * Supports: @fontSize, **bold**, *italic*, align:direction, color:value
 */
export const parseTextInput = (input: string): ParsedTextData => {
	const patterns = {
		fontSize: /@(\d+)(px|rem|em)?/g,
		bold: /\*\*(.*?)\*\*/g,
		italic: /(?<!\*)\*([^*]+)\*(?!\*)|\b_([^_]+)_\b/g,
		alignment: /align:(left|center|right)/i,
		color: /color:([#\w-]+)/i,
	};

	let content = input;
	const metadata: ParsedTextData['metadata'] = {};

	// Extract font size
	const sizeMatches = Array.from(content.matchAll(patterns.fontSize));
	if (sizeMatches.length > 0) {
		const lastMatch = sizeMatches[sizeMatches.length - 1];
		const size = lastMatch[1];
		const unit = lastMatch[2] || 'px';
		metadata.fontSize = `${size}${unit}`;
		content = content.replace(patterns.fontSize, '');
	}

	// Extract alignment
	const alignMatch = patterns.alignment.exec(content);
	if (alignMatch) {
		metadata.textAlign = alignMatch[1].toLowerCase() as 'left' | 'center' | 'right';
		content = content.replace(patterns.alignment, '');
	}

	// Extract color
	const colorMatch = patterns.color.exec(content);
	if (colorMatch) {
		metadata.textColor = colorMatch[1];
		content = content.replace(patterns.color, '');
	}

	// Process bold formatting
	if (patterns.bold.test(content)) {
		metadata.fontWeight = 'bold';
		content = content.replace(patterns.bold, '$1');
	}

	// Process italic formatting
	if (patterns.italic.test(content)) {
		metadata.fontStyle = 'italic';
		content = content.replace(patterns.italic, (match, group1, group2) => {
			return group1 || group2;
		});
	}

	return {
		content: content.trim(),
		metadata,
	};
};

/**
 * Parse annotation input with embedded patterns
 * Supports all embedded patterns via parseEmbeddedPatterns
 */
export const parseAnnotationInput = (input: string): ParsedAnnotationData => {
	if (!input || typeof input !== 'string') {
		return { text: '' };
	}

	const parsedPatterns = parseEmbeddedPatterns(input);

	const result: ParsedAnnotationData = {
		text: parsedPatterns.cleanText || input,
	};

	// Extract metadata from patterns
	for (const pattern of parsedPatterns.patterns) {
		switch (pattern.type) {
			case 'priority':
				if (!result.type && ['warning', 'error', 'info', 'success', 'note'].includes(pattern.value)) {
					result.type = pattern.value as 'note' | 'warning' | 'info' | 'success' | 'error';
				}
				break;
		}
	}

	// Set default type if not specified
	if (!result.type) {
		result.type = 'note';
	}

	return result;
};

/**
 * Parse question input with Q&A structure
 * Supports embedded patterns and answer formatting
 */
export const parseQuestionInput = (input: string): ParsedQuestionData => {
	if (!input || typeof input !== 'string') {
		return { question: 'New question', answer: '' };
	}

	const lines = input.split('\n');
	let questionText = '';
	let answerText = '';
	let isAnswerSection = false;

	for (const line of lines) {
		const trimmedLine = line.trim();
		
		if (trimmedLine.toLowerCase().startsWith('a:') || 
			trimmedLine.toLowerCase().startsWith('answer:')) {
			isAnswerSection = true;
			answerText += trimmedLine.replace(/^(a:|answer:)/i, '').trim() + ' ';
		} else if (isAnswerSection) {
			answerText += trimmedLine + ' ';
		} else {
			questionText += trimmedLine + ' ';
		}
	}

	// Parse patterns from question text
	const questionPatterns = parseEmbeddedPatterns(questionText.trim());
	const answerPatterns = parseEmbeddedPatterns(answerText.trim());

	const result: ParsedQuestionData = {
		question: questionPatterns.cleanText || questionText.trim() || 'New question',
		answer: answerPatterns.cleanText || answerText.trim(),
	};

	// Detect question type from patterns
	const questionTextLower = questionText.toLowerCase();
	if (questionTextLower.includes('[yes/no]') || questionTextLower.includes('yes or no')) {
		result.type = 'yes-no';
	} else if (questionTextLower.includes('[') && questionTextLower.includes(']')) {
		// Extract options from brackets
		const optionsMatch = questionTextLower.match(/\[([^\]]+)\]/);
		if (optionsMatch && optionsMatch[1].includes(',')) {
			result.type = 'multiple-choice';
			result.options = optionsMatch[1].split(',').map(opt => opt.trim());
		}
	} else {
		result.type = 'open';
	}

	return result;
};