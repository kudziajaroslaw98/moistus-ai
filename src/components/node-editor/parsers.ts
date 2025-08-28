import { nanoid } from 'nanoid';
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

// Parse task input with due date, priority, assignee, and tags
// Supports multiple tasks separated by semicolons, newlines, or markdown-style lists
export const parseTaskInput = (input: string): ParsedTaskData => {
	const patterns = {
		dueDate: /@(\S+)/g,
		priority: /#(low|medium|high)/i,
		assignee: /\+(\w+)/g,
		tags: /\[([\w,\s]+)\]/g,
		markdownTask: /^(?:[-*]\s*)?\[([x\s])\]\s*(.+)$/gm,
		colonPrefix: /^(.+?):\s*(.+)$/,
	};

	let content = input;
	const metadata: Partial<ParsedTaskData> = { tasks: [] };

	// Parse multiple tasks FIRST before extracting metadata
	let taskTexts: (string | { text: string; isComplete: boolean })[] = [];

	// Check for markdown-style task list
	const markdownTasks = Array.from(content.matchAll(patterns.markdownTask));

	if (markdownTasks.length > 0) {
		taskTexts = markdownTasks.map((match) => ({
			text: match[2].trim(),
			isComplete: match[1].toLowerCase() === 'x'
		}));
	} else {
		// Check for colon-prefixed list (e.g., "Sprint tasks: task1; task2; task3")
		const colonMatch = patterns.colonPrefix.exec(content);

		if (colonMatch) {
			const listContent = colonMatch[2];

			// Split by semicolon first, then by comma if no semicolons
			if (listContent.includes(';')) {
				taskTexts = listContent
					.split(';')
					.map((t) => t.trim())
					.filter((t) => t.length > 0);
			} else if (listContent.includes(',')) {
				// Only split by comma if it's not inside brackets
				taskTexts = listContent
					.split(/,(?![^\[]*\])/)
					.map((t) => t.trim())
					.filter((t) => t.length > 0);
			} else {
				// Single task after colon
				taskTexts = [listContent.trim()];
			}
		} else {
			// Split by newlines first
			const lines = content
				.split('\n')
				.map((l) => l.trim())
				.filter((l) => l.length > 0);

			if (lines.length > 1) {
				taskTexts = lines;
			} else if (content.includes(';')) {
				// Split by semicolon
				taskTexts = content
					.split(';')
					.map((t) => t.trim())
					.filter((t) => t.length > 0);
			} else if (content.includes(',') && !content.match(/\[[^\]]*,[^\]]*\]/)) {
				// Split by comma only if not inside brackets
				taskTexts = content
					.split(/,(?![^\[]*\])/)
					.map((t) => t.trim())
					.filter((t) => t.length > 0);
			} else {
				// Single task
				const trimmed = content.trim();

				if (trimmed) {
					taskTexts = [trimmed];
				}
			}
		}
	}

	// Create task objects
	metadata.tasks = taskTexts.map((task) => ({
		id: nanoid(),
		text: typeof task === 'string' ? task : task.text,
		isComplete: typeof task === 'string' ? false : task.isComplete,
	}));

	// If no tasks were parsed, create a default empty task
	if (metadata.tasks.length === 0) {
		metadata.tasks = [
			{
				id: nanoid(),
				text: 'New task',
				isComplete: false,
			},
		];
	}

	// Extract global metadata (applies to all tasks) AFTER parsing tasks
	const dateMatch = patterns.dueDate.exec(input);

	if (dateMatch) {
		metadata.dueDate = parseDateString(dateMatch[1]);
	}

	const priorityMatch = patterns.priority.exec(input);

	if (priorityMatch) {
		metadata.priority = priorityMatch[1].toLowerCase() as
			| 'low'
			| 'medium'
			| 'high';
	}

	const assigneeMatch = patterns.assignee.exec(input);

	if (assigneeMatch) {
		metadata.assignee = assigneeMatch[1];
	}

	// Extract tags
	const tags: string[] = [];
	let tagMatch;
	// Reset regex state
	patterns.tags.lastIndex = 0;

	while ((tagMatch = patterns.tags.exec(input)) !== null) {
		tags.push(...tagMatch[1].split(',').map((t) => t.trim()));
	}

	if (tags.length > 0) {
		metadata.tags = tags;
	}

	return metadata as ParsedTaskData;
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
