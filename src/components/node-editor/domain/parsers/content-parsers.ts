/**
 * Content parsers for basic text-based nodes
 * Handles notes, text formatting, annotations, and questions
 */

import { parseEmbeddedPatterns } from './common-utilities';
import type { ParsedNoteData, ParsedTextData, ParsedAnnotationData, ParsedQuestionData } from '../../types';

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
		metadata.color = colorMatch[1];
		content = content.replace(patterns.color, '');
	}

	// Process bold formatting
	content = content.replace(patterns.bold, '<strong>$1</strong>');

	// Process italic formatting
	content = content.replace(patterns.italic, (match, group1, group2) => {
		const text = group1 || group2;
		return `<em>${text}</em>`;
	});

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
		return { content: '' };
	}

	const parsedPatterns = parseEmbeddedPatterns(input);

	const result: ParsedAnnotationData = {
		content: parsedPatterns.cleanText || input,
	};

	// Extract metadata from patterns
	for (const pattern of parsedPatterns.patterns) {
		switch (pattern.type) {
			case 'tag':
				if (!result.tags) {
					result.tags = [];
				}
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
			case 'priority':
				if (!result.priority && ['low', 'medium', 'high'].includes(pattern.value)) {
					result.priority = pattern.value as 'low' | 'medium' | 'high';
				}
				break;
		}
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

	// Extract metadata from both question and answer patterns
	const allPatterns = [...questionPatterns.patterns, ...answerPatterns.patterns];
	for (const pattern of allPatterns) {
		switch (pattern.type) {
			case 'tag':
				if (!result.tags) {
					result.tags = [];
				}
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

	return result;
};