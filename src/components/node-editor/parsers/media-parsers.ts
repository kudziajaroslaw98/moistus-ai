/**
 * Media parsers for resource-based nodes
 * Handles code, images, resources/links with metadata extraction
 */

import type { ParsedCodeData, ParsedImageData, ParsedResourceData } from '../types';

/**
 * Parse code input with language detection and formatting
 * Supports: ```language code```, file patterns, auto-detection
 */
export const parseCodeInput = (input: string): ParsedCodeData => {
	const patterns = {
		codeBlock: /```(\w+)?\s*([\s\S]*?)```/,
		filePattern: /(\w+)\s+file:(\S+)/,
	};

	// Check for code block with language
	const codeBlockMatch = patterns.codeBlock.exec(input);
	if (codeBlockMatch) {
		return {
			language: codeBlockMatch[1] || 'plaintext',
			code: codeBlockMatch[2].trim(),
		};
	}

	// Check for file pattern (e.g., "python file:utils.py")
	const fileMatch = patterns.filePattern.exec(input);
	if (fileMatch) {
		return {
			language: fileMatch[1],
			code: '',
			filename: fileMatch[2],
		};
	}

	// Detect language from common patterns
	const languagePatterns: Array<[RegExp, string]> = [
		[/\b(const|let|var|function|=>|async|await)\b/, 'javascript'],
		[/\b(interface|type|namespace|enum)\b/, 'typescript'],
		[/\b(def|import|from|class|if __name__)\b/, 'python'],
		[/\b(public|private|class|void|int|String)\b/, 'java'],
		[/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/i, 'sql'],
		[/<[a-zA-Z]+.*?>.*?<\/[a-zA-Z]+>/, 'html'],
		[/\{[\s\S]*:\s*[\s\S]*\}/, 'json'],
	];

	let detectedLanguage = 'plaintext';
	for (const [pattern, language] of languagePatterns) {
		if (pattern.test(input)) {
			detectedLanguage = language;
			break;
		}
	}

	return {
		language: detectedLanguage,
		code: input.trim(),
	};
};

/**
 * Parse image input with alt text and captions
 * Supports: URL "alt text", URL cap:description
 */
export const parseImageInput = (input: string): ParsedImageData => {
	const patterns = {
		urlWithAlt: /^(.+?)\s+"([^"]+)"$/,
		urlWithCaption: /^(.+?)\s+cap:(.+)$/i,
	};

	// Check for URL with alt text
	const altMatch = patterns.urlWithAlt.exec(input);
	if (altMatch) {
		return {
			url: altMatch[1].trim(),
			alt: altMatch[2].trim(),
		};
	}

	// Check for URL with caption
	const captionMatch = patterns.urlWithCaption.exec(input);
	if (captionMatch) {
		return {
			url: captionMatch[1].trim(),
			caption: captionMatch[2].trim(),
		};
	}

	// Simple URL
	return {
		url: input.trim(),
	};
};

/**
 * Parse resource/link input with titles and descriptions
 * Supports: URL "title", URL desc:description, auto-type detection
 */
export const parseResourceInput = (input: string): ParsedResourceData => {
	const patterns = {
		urlWithTitle: /^(.+?)\s+"([^"]+)"$/,
		urlWithDescription: /^(.+?)\s+desc:(.+)$/i,
	};

	// Check for URL with title
	const titleMatch = patterns.urlWithTitle.exec(input);
	if (titleMatch) {
		return {
			url: titleMatch[1].trim(),
			title: titleMatch[2].trim(),
		};
	}

	// Check for URL with description
	const descMatch = patterns.urlWithDescription.exec(input);
	if (descMatch) {
		return {
			url: descMatch[1].trim(),
			description: descMatch[2].trim(),
		};
	}

	// Detect resource type from URL
	const url = input.trim();
	let type: 'link' | 'document' | 'video' | 'other' = 'link';

	if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(url)) {
		type = 'document';
	} else if (/youtube\.com|vimeo\.com|\.mp4|\.webm/i.test(url)) {
		type = 'video';
	}

	return {
		url,
		type,
	};
};

/**
 * Check if input looks like a URL
 */
export const isValidUrl = (input: string): boolean => {
	try {
		new URL(input);
		return true;
	} catch {
		return /^https?:\/\//.test(input) || /^www\./.test(input);
	}
};

/**
 * Extract file extension from URL or filename
 */
export const getFileExtension = (url: string): string => {
	const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
	return match ? match[1].toLowerCase() : '';
};

/**
 * Detect content type from URL
 */
export const detectContentType = (url: string): 'image' | 'video' | 'document' | 'code' | 'other' => {
	const extension = getFileExtension(url);
	
	if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
		return 'image';
	}
	
	if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
		return 'video';
	}
	
	if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
		return 'document';
	}
	
	if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml'].includes(extension)) {
		return 'code';
	}
	
	return 'other';
};