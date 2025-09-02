import { nanoid } from 'nanoid';
import { detectPatternContext, getCompletionItemsForPattern } from './utils/completion-data';
import type {
	ParsedAnnotationData,
	ParsedCodeData,
	ParsedImageData,
	ParsedNoteData,
	ParsedQuestionData,
	ParsedResourceData,
	ParsedTaskData,
	ParsedTextData,
} from './types';
import type { PatternType } from './utils/completion-types';

// Helper function to parse date strings
const parseDateString = (dateStr: string): Date | undefined => {
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

// Parse note input with tags and priority
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
		metadata.priority = priorityMatch[1].toLowerCase() as
			| 'low'
			| 'medium'
			| 'high';
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

// Parse task input with support for multiple markdown checkboxes
// Creates multiple tasks if checkboxes are found, otherwise single task with patterns
export const parseTaskInput = (input: string): ParsedTaskData => {
	if (!input || typeof input !== 'string') {
		return {
			tasks: [{
				id: nanoid(),
				text: 'New task',
				isComplete: false,
				patterns: [],
			}],
		};
	}

	const trimmedInput = input.trim();
	if (!trimmedInput) {
		return {
			tasks: [{
				id: nanoid(),
				text: 'New task',
				isComplete: false,
				patterns: [],
			}],
		};
	}

	// Check if input contains multiple checkbox lines
	const lines = trimmedInput.split('\n');
	const checkboxLines = lines.filter(line => {
		const trimmedLine = line.trim();
		return /^\s*(?:[-*]\s*)?\[[xX;,\s]*\]\s*.+/.test(trimmedLine);
	});

	if (checkboxLines.length > 1) {
		// Multiple checkbox lines detected - create separate tasks for each
		const tasks = checkboxLines.map(line => {
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
				};
			}
			
			// Fallback for malformed lines
			return {
				id: nanoid(),
				text: trimmedLine,
				isComplete: false,
				patterns: [],
			};
		});

		// Extract all patterns from all tasks for node-level metadata
		const allPatterns = tasks.flatMap(task => (task as any)._tempPatterns || []);
		
		// Clean up tasks to remove temporary patterns
		const cleanTasks = tasks.map(task => {
			const { _tempPatterns, ...cleanTask } = task as any;
			return cleanTask;
		});

		// Create result with cleaned tasks
		const result: ParsedTaskData = { tasks: cleanTasks };
		for (const pattern of allPatterns) {
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
		
		return result;
	} else if (checkboxLines.length === 1) {
		// Single checkbox line detected
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
			for (const pattern of parsedPatterns.patterns) {
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

			return result;
		}
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
	for (const pattern of parsedPatterns.patterns) {
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

	return result;
};


// Parse code input with language detection
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

// Enhanced helper function to parse all embedded patterns within task text
const parseEmbeddedPatterns = (text: string): { 
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
	
	// Sort matches by position (earliest first) to maintain order during processing
	allMatches.sort((a, b) => a.match.index - b.match.index);
	
	// Process matches and extract patterns
	const replacements: Array<{start: number, end: number, fullMatch: string}> = [];
	
	allMatches.forEach(({match, type, extractFn}) => {
		// Check for overlaps with already processed matches
		const hasOverlap = replacements.some(r => 
			(match.index >= r.start && match.index < r.end) ||
			(match.index + match[0].length > r.start && match.index < r.start)
		);
		
		if (!hasOverlap) {
			const extracted = extractFn(match);
			
			// Only create pattern entry if extraction was successful (not null)
			if (extracted) {
				patterns.push({
					type,
					value: extracted.value,
					display: extracted.display,
					position: match.index
				});
				
				replacements.push({
					start: match.index,
					end: match.index + match[0].length,
					fullMatch: match[0]
				});
			}
		}
	});
	
	// Remove patterns from text (in reverse order to maintain positions)
	replacements.sort((a, b) => b.start - a.start);
	replacements.forEach(replacement => {
		const beforePattern = cleanText.substring(0, replacement.start);
		const afterPattern = cleanText.substring(replacement.end);
		
		cleanText = beforePattern + afterPattern;
	});
	
	// Clean up extra whitespace and orphaned commas
	cleanText = cleanText.replace(/\s+/g, ' '); // collapse multiple spaces
	cleanText = cleanText.replace(/,\s*,+/g, ','); // remove duplicate commas  
	cleanText = cleanText.replace(/\s+,/g, ''); // remove space-comma (orphaned comma)
	cleanText = cleanText.replace(/,\s*$/, ''); // remove trailing comma
	cleanText = cleanText.replace(/^\s*,/, ''); // remove leading comma
	cleanText = cleanText.replace(/,\s+/g, ', '); // normalize comma spacing for remaining commas
	cleanText = cleanText.replace(/,([^\s])/g, ', $1'); // ensure space after comma
	
	// Handle specific case: comma before "but" when it creates unnatural pause after pattern removal
	cleanText = cleanText.replace(/,\s+but\b/g, ' but');
	
	cleanText = cleanText.trim();
	
	// Sort patterns by original position for consistent display
	patterns.sort((a, b) => a.position - b.position);
	
	return { 
		cleanText, 
		patterns: patterns.map(p => ({type: p.type, value: p.value, display: p.display, position: p.position}))
	};
};

// Helper function to format colors for display
const formatColorForDisplay = (color: string): string => {
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

// Helper function to format dates for display
const formatDateForDisplay = (date: Date, original: string): string => {
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
	const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	if (weekdays.includes(original.toLowerCase())) {
		return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
	}
	
	// Default to formatted date
	return date.toLocaleDateString('en-US', { 
		month: 'short', 
		day: 'numeric',
		year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
	});
};

// Helper function to format priority for display
const formatPriorityForDisplay = (priority: string): string => {
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

// Parse image input
export const parseImageInput = (input: string): ParsedImageData => {
	const patterns = {
		urlWithAlt: /^(.+?)\s+"([^"]+)"$/,
		urlWithCaption: /^(.+?)\s+caption:(.+)$/i,
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

// Parse resource/link input
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

// Parse annotation input
export const parseAnnotationInput = (input: string): ParsedAnnotationData => {
	const patterns = {
		emoji: /^(⚠️|✅|ℹ️|❌|💡)\s*(.+)$/,
		typePrefix: /^(note|warning|info|success|error):\s*(.+)$/i,
	};

	// Check for emoji prefix
	const emojiMatch = patterns.emoji.exec(input);

	if (emojiMatch) {
		const emojiTypeMap: Record<
			string,
			'note' | 'warning' | 'info' | 'success' | 'error'
		> = {
			'⚠️': 'warning',
			'✅': 'success',
			'ℹ️': 'info',
			'❌': 'error',
			'💡': 'note',
		};
		return {
			text: emojiMatch[2].trim(),
			type: emojiTypeMap[emojiMatch[1]] || 'note',
			icon: emojiMatch[1],
		};
	}

	// Check for type prefix
	const typeMatch = patterns.typePrefix.exec(input);

	if (typeMatch) {
		return {
			text: typeMatch[2].trim(),
			type: typeMatch[1].toLowerCase() as
				| 'note'
				| 'warning'
				| 'info'
				| 'success'
				| 'error',
		};
	}

	// Default to note type
	return {
		text: input.trim(),
		type: 'note',
	};
};

// Parse question input
export const parseQuestionInput = (input: string): ParsedQuestionData => {
	const patterns = {
		yesNo: /\[yes\/no\]|\[y\/n\]/i,
		multipleChoice: /\[(.+?)\]/,
	};

	let question = input;
	const metadata: Partial<ParsedQuestionData> = {};

	// Check for yes/no question
	if (patterns.yesNo.test(input)) {
		metadata.type = 'yes-no';
		question = question.replace(patterns.yesNo, '').trim();
	} else {
		// Check for multiple choice options
		const optionsMatch = patterns.multipleChoice.exec(input);

		if (optionsMatch && optionsMatch[1].includes(',')) {
			metadata.type = 'multiple-choice';
			metadata.options = optionsMatch[1].split(',').map((opt) => opt.trim());
			question = question.replace(patterns.multipleChoice, '').trim();
		} else {
			metadata.type = 'open';
		}
	}

	return {
		question: question.trim(),
		...metadata,
	};
};

// Parse text input with formatting patterns
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
		// Remove all size patterns from content
		content = content.replace(patterns.fontSize, '');
	}

	// Extract alignment
	const alignMatch = patterns.alignment.exec(content);

	if (alignMatch) {
		metadata.textAlign = alignMatch[1].toLowerCase() as
			| 'left'
			| 'center'
			| 'right';
		content = content.replace(patterns.alignment, '');
	}

	// Extract color
	const colorMatch = patterns.color.exec(content);

	if (colorMatch) {
		metadata.textColor = colorMatch[1];
		content = content.replace(patterns.color, '');
	}

	// Check for bold formatting (but keep the text)
	if (patterns.bold.test(content)) {
		metadata.fontWeight = 'bold';
		// Replace **text** with just text
		content = content.replace(patterns.bold, '$1');
	}

	// Check for italic formatting (but keep the text)
	if (patterns.italic.test(content)) {
		metadata.fontStyle = 'italic';
		// Replace *text* or _text_ with just text
		content = content.replace(patterns.italic, '$1$2');
	}

	// Clean up the content
	content = content.trim();

	// Return parsed data
	const result: ParsedTextData = {
		content,
	};

	// Only add metadata if we have any
	if (Object.keys(metadata).length > 0) {
		result.metadata = metadata;
	}

	return result;
};
