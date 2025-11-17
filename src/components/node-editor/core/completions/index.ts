/**
 * Simple completion system for node editor
 * Provides basic completions for common patterns
 */

export interface CompletionItem {
	value: string;
	label: string;
	description?: string;
	category?: string;
	hexColor?: string; // For color completions to show color swatches
}

/**
 * Get completions for date patterns
 */
export const getDateCompletions = (query: string): CompletionItem[] => {
	const dateKeywords = [
		{ value: 'today', label: 'Today', description: 'Current date' },
		{ value: 'tomorrow', label: 'Tomorrow', description: 'Next day' },
		{ value: 'yesterday', label: 'Yesterday', description: 'Previous day' },
		{ value: 'monday', label: 'Monday', description: 'Next Monday' },
		{ value: 'tuesday', label: 'Tuesday', description: 'Next Tuesday' },
		{ value: 'wednesday', label: 'Wednesday', description: 'Next Wednesday' },
		{ value: 'thursday', label: 'Thursday', description: 'Next Thursday' },
		{ value: 'friday', label: 'Friday', description: 'Next Friday' },
		{ value: 'saturday', label: 'Saturday', description: 'Next Saturday' },
		{ value: 'sunday', label: 'Sunday', description: 'Next Sunday' },
	];

	return dateKeywords.filter(
		(item) =>
			item.value.toLowerCase().includes(query.toLowerCase()) ||
			item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for priority patterns
 */
export const getPriorityCompletions = (query: string): CompletionItem[] => {
	const priorities = [
		{ value: 'low', label: 'Low', description: 'Low priority' },
		{ value: 'medium', label: 'Medium', description: 'Medium priority' },
		{ value: 'high', label: 'High', description: 'High priority' },
		{ value: 'critical', label: 'Critical', description: 'Critical priority' },
		{ value: 'urgent', label: 'Urgent', description: 'Urgent priority' },
		{ value: 'asap', label: 'ASAP', description: 'As soon as possible' },
		{ value: 'blocked', label: 'Blocked', description: 'Blocked task' },
		{
			value: 'waiting',
			label: 'Waiting',
			description: 'Waiting for something',
		},
	];

	return priorities.filter(
		(item) =>
			item.value.toLowerCase().includes(query.toLowerCase()) ||
			item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for color patterns - using Tailwind CSS color palette
 */
export const getColorCompletions = (query: string): CompletionItem[] => {
	const colors = [
		// Core colors - most commonly used
		{
			value: 'white',
			label: 'White',
			description: '#ffffff',
			hexColor: '#ffffff',
		},
		{
			value: 'black',
			label: 'Black',
			description: '#000000',
			hexColor: '#000000',
		},

		// Grays
		{
			value: 'gray-50',
			label: 'Gray 50',
			description: '#f9fafb',
			hexColor: '#f9fafb',
		},
		{
			value: 'gray-100',
			label: 'Gray 100',
			description: '#f3f4f6',
			hexColor: '#f3f4f6',
		},
		{
			value: 'gray-200',
			label: 'Gray 200',
			description: '#e5e7eb',
			hexColor: '#e5e7eb',
		},
		{
			value: 'gray-300',
			label: 'Gray 300',
			description: '#d1d5db',
			hexColor: '#d1d5db',
		},
		{
			value: 'gray-400',
			label: 'Gray 400',
			description: '#9ca3af',
			hexColor: '#9ca3af',
		},
		{
			value: 'gray-500',
			label: 'Gray 500',
			description: '#6b7280',
			hexColor: '#6b7280',
		},
		{
			value: 'gray-600',
			label: 'Gray 600',
			description: '#4b5563',
			hexColor: '#4b5563',
		},
		{
			value: 'gray-700',
			label: 'Gray 700',
			description: '#374151',
			hexColor: '#374151',
		},
		{
			value: 'gray-800',
			label: 'Gray 800',
			description: '#1f2937',
			hexColor: '#1f2937',
		},
		{
			value: 'gray-900',
			label: 'Gray 900',
			description: '#111827',
			hexColor: '#111827',
		},

		// Reds
		{
			value: 'red-50',
			label: 'Red 50',
			description: '#fef2f2',
			hexColor: '#fef2f2',
		},
		{
			value: 'red-100',
			label: 'Red 100',
			description: '#fee2e2',
			hexColor: '#fee2e2',
		},
		{
			value: 'red-200',
			label: 'Red 200',
			description: '#fecaca',
			hexColor: '#fecaca',
		},
		{
			value: 'red-300',
			label: 'Red 300',
			description: '#fca5a5',
			hexColor: '#fca5a5',
		},
		{
			value: 'red-400',
			label: 'Red 400',
			description: '#f87171',
			hexColor: '#f87171',
		},
		{
			value: 'red-500',
			label: 'Red 500',
			description: '#ef4444',
			hexColor: '#ef4444',
		},
		{
			value: 'red-600',
			label: 'Red 600',
			description: '#dc2626',
			hexColor: '#dc2626',
		},
		{
			value: 'red-700',
			label: 'Red 700',
			description: '#b91c1c',
			hexColor: '#b91c1c',
		},
		{
			value: 'red-800',
			label: 'Red 800',
			description: '#991b1b',
			hexColor: '#991b1b',
		},
		{
			value: 'red-900',
			label: 'Red 900',
			description: '#7f1d1d',
			hexColor: '#7f1d1d',
		},

		// Blues
		{
			value: 'blue-50',
			label: 'Blue 50',
			description: '#eff6ff',
			hexColor: '#eff6ff',
		},
		{
			value: 'blue-100',
			label: 'Blue 100',
			description: '#dbeafe',
			hexColor: '#dbeafe',
		},
		{
			value: 'blue-200',
			label: 'Blue 200',
			description: '#bfdbfe',
			hexColor: '#bfdbfe',
		},
		{
			value: 'blue-300',
			label: 'Blue 300',
			description: '#93c5fd',
			hexColor: '#93c5fd',
		},
		{
			value: 'blue-400',
			label: 'Blue 400',
			description: '#60a5fa',
			hexColor: '#60a5fa',
		},
		{
			value: 'blue-500',
			label: 'Blue 500',
			description: '#3b82f6',
			hexColor: '#3b82f6',
		},
		{
			value: 'blue-600',
			label: 'Blue 600',
			description: '#2563eb',
			hexColor: '#2563eb',
		},
		{
			value: 'blue-700',
			label: 'Blue 700',
			description: '#1d4ed8',
			hexColor: '#1d4ed8',
		},
		{
			value: 'blue-800',
			label: 'Blue 800',
			description: '#1e40af',
			hexColor: '#1e40af',
		},
		{
			value: 'blue-900',
			label: 'Blue 900',
			description: '#1e3a8a',
			hexColor: '#1e3a8a',
		},

		// Greens
		{
			value: 'green-50',
			label: 'Green 50',
			description: '#f0fdf4',
			hexColor: '#f0fdf4',
		},
		{
			value: 'green-100',
			label: 'Green 100',
			description: '#dcfce7',
			hexColor: '#dcfce7',
		},
		{
			value: 'green-200',
			label: 'Green 200',
			description: '#bbf7d0',
			hexColor: '#bbf7d0',
		},
		{
			value: 'green-300',
			label: 'Green 300',
			description: '#86efac',
			hexColor: '#86efac',
		},
		{
			value: 'green-400',
			label: 'Green 400',
			description: '#4ade80',
			hexColor: '#4ade80',
		},
		{
			value: 'green-500',
			label: 'Green 500',
			description: '#22c55e',
			hexColor: '#22c55e',
		},
		{
			value: 'green-600',
			label: 'Green 600',
			description: '#16a34a',
			hexColor: '#16a34a',
		},
		{
			value: 'green-700',
			label: 'Green 700',
			description: '#15803d',
			hexColor: '#15803d',
		},
		{
			value: 'green-800',
			label: 'Green 800',
			description: '#166534',
			hexColor: '#166534',
		},
		{
			value: 'green-900',
			label: 'Green 900',
			description: '#14532d',
			hexColor: '#14532d',
		},

		// Yellows
		{
			value: 'yellow-50',
			label: 'Yellow 50',
			description: '#fefce8',
			hexColor: '#fefce8',
		},
		{
			value: 'yellow-100',
			label: 'Yellow 100',
			description: '#fef3c7',
			hexColor: '#fef3c7',
		},
		{
			value: 'yellow-200',
			label: 'Yellow 200',
			description: '#fde68a',
			hexColor: '#fde68a',
		},
		{
			value: 'yellow-300',
			label: 'Yellow 300',
			description: '#fcd34d',
			hexColor: '#fcd34d',
		},
		{
			value: 'yellow-400',
			label: 'Yellow 400',
			description: '#fbbf24',
			hexColor: '#fbbf24',
		},
		{
			value: 'yellow-500',
			label: 'Yellow 500',
			description: '#f59e0b',
			hexColor: '#f59e0b',
		},
		{
			value: 'yellow-600',
			label: 'Yellow 600',
			description: '#d97706',
			hexColor: '#d97706',
		},
		{
			value: 'yellow-700',
			label: 'Yellow 700',
			description: '#b45309',
			hexColor: '#b45309',
		},
		{
			value: 'yellow-800',
			label: 'Yellow 800',
			description: '#92400e',
			hexColor: '#92400e',
		},
		{
			value: 'yellow-900',
			label: 'Yellow 900',
			description: '#78350f',
			hexColor: '#78350f',
		},

		// Purples
		{
			value: 'purple-50',
			label: 'Purple 50',
			description: '#faf5ff',
			hexColor: '#faf5ff',
		},
		{
			value: 'purple-100',
			label: 'Purple 100',
			description: '#f3e8ff',
			hexColor: '#f3e8ff',
		},
		{
			value: 'purple-200',
			label: 'Purple 200',
			description: '#e9d5ff',
			hexColor: '#e9d5ff',
		},
		{
			value: 'purple-300',
			label: 'Purple 300',
			description: '#d8b4fe',
			hexColor: '#d8b4fe',
		},
		{
			value: 'purple-400',
			label: 'Purple 400',
			description: '#c084fc',
			hexColor: '#c084fc',
		},
		{
			value: 'purple-500',
			label: 'Purple 500',
			description: '#a855f7',
			hexColor: '#a855f7',
		},
		{
			value: 'purple-600',
			label: 'Purple 600',
			description: '#9333ea',
			hexColor: '#9333ea',
		},
		{
			value: 'purple-700',
			label: 'Purple 700',
			description: '#7c3aed',
			hexColor: '#7c3aed',
		},
		{
			value: 'purple-800',
			label: 'Purple 800',
			description: '#6b21a8',
			hexColor: '#6b21a8',
		},
		{
			value: 'purple-900',
			label: 'Purple 900',
			description: '#581c87',
			hexColor: '#581c87',
		},

		// Pinks
		{
			value: 'pink-50',
			label: 'Pink 50',
			description: '#fdf2f8',
			hexColor: '#fdf2f8',
		},
		{
			value: 'pink-100',
			label: 'Pink 100',
			description: '#fce7f3',
			hexColor: '#fce7f3',
		},
		{
			value: 'pink-200',
			label: 'Pink 200',
			description: '#fbcfe8',
			hexColor: '#fbcfe8',
		},
		{
			value: 'pink-300',
			label: 'Pink 300',
			description: '#f9a8d4',
			hexColor: '#f9a8d4',
		},
		{
			value: 'pink-400',
			label: 'Pink 400',
			description: '#f472b6',
			hexColor: '#f472b6',
		},
		{
			value: 'pink-500',
			label: 'Pink 500',
			description: '#ec4899',
			hexColor: '#ec4899',
		},
		{
			value: 'pink-600',
			label: 'Pink 600',
			description: '#db2777',
			hexColor: '#db2777',
		},
		{
			value: 'pink-700',
			label: 'Pink 700',
			description: '#be185d',
			hexColor: '#be185d',
		},
		{
			value: 'pink-800',
			label: 'Pink 800',
			description: '#9d174d',
			hexColor: '#9d174d',
		},
		{
			value: 'pink-900',
			label: 'Pink 900',
			description: '#831843',
			hexColor: '#831843',
		},

		// Indigos
		{
			value: 'indigo-50',
			label: 'Indigo 50',
			description: '#eef2ff',
			hexColor: '#eef2ff',
		},
		{
			value: 'indigo-100',
			label: 'Indigo 100',
			description: '#e0e7ff',
			hexColor: '#e0e7ff',
		},
		{
			value: 'indigo-200',
			label: 'Indigo 200',
			description: '#c7d2fe',
			hexColor: '#c7d2fe',
		},
		{
			value: 'indigo-300',
			label: 'Indigo 300',
			description: '#a5b4fc',
			hexColor: '#a5b4fc',
		},
		{
			value: 'indigo-400',
			label: 'Indigo 400',
			description: '#818cf8',
			hexColor: '#818cf8',
		},
		{
			value: 'indigo-500',
			label: 'Indigo 500',
			description: '#6366f1',
			hexColor: '#6366f1',
		},
		{
			value: 'indigo-600',
			label: 'Indigo 600',
			description: '#4f46e5',
			hexColor: '#4f46e5',
		},
		{
			value: 'indigo-700',
			label: 'Indigo 700',
			description: '#4338ca',
			hexColor: '#4338ca',
		},
		{
			value: 'indigo-800',
			label: 'Indigo 800',
			description: '#3730a3',
			hexColor: '#3730a3',
		},
		{
			value: 'indigo-900',
			label: 'Indigo 900',
			description: '#312e81',
			hexColor: '#312e81',
		},

		// Oranges
		{
			value: 'orange-50',
			label: 'Orange 50',
			description: '#fff7ed',
			hexColor: '#fff7ed',
		},
		{
			value: 'orange-100',
			label: 'Orange 100',
			description: '#ffedd5',
			hexColor: '#ffedd5',
		},
		{
			value: 'orange-200',
			label: 'Orange 200',
			description: '#fed7aa',
			hexColor: '#fed7aa',
		},
		{
			value: 'orange-300',
			label: 'Orange 300',
			description: '#fdba74',
			hexColor: '#fdba74',
		},
		{
			value: 'orange-400',
			label: 'Orange 400',
			description: '#fb923c',
			hexColor: '#fb923c',
		},
		{
			value: 'orange-500',
			label: 'Orange 500',
			description: '#f97316',
			hexColor: '#f97316',
		},
		{
			value: 'orange-600',
			label: 'Orange 600',
			description: '#ea580c',
			hexColor: '#ea580c',
		},
		{
			value: 'orange-700',
			label: 'Orange 700',
			description: '#c2410c',
			hexColor: '#c2410c',
		},
		{
			value: 'orange-800',
			label: 'Orange 800',
			description: '#9a3412',
			hexColor: '#9a3412',
		},
		{
			value: 'orange-900',
			label: 'Orange 900',
			description: '#7c2d12',
			hexColor: '#7c2d12',
		},

		// Teals
		{
			value: 'teal-50',
			label: 'Teal 50',
			description: '#f0fdfa',
			hexColor: '#f0fdfa',
		},
		{
			value: 'teal-100',
			label: 'Teal 100',
			description: '#ccfbf1',
			hexColor: '#ccfbf1',
		},
		{
			value: 'teal-200',
			label: 'Teal 200',
			description: '#99f6e4',
			hexColor: '#99f6e4',
		},
		{
			value: 'teal-300',
			label: 'Teal 300',
			description: '#5eead4',
			hexColor: '#5eead4',
		},
		{
			value: 'teal-400',
			label: 'Teal 400',
			description: '#2dd4bf',
			hexColor: '#2dd4bf',
		},
		{
			value: 'teal-500',
			label: 'Teal 500',
			description: '#14b8a6',
			hexColor: '#14b8a6',
		},
		{
			value: 'teal-600',
			label: 'Teal 600',
			description: '#0d9488',
			hexColor: '#0d9488',
		},
		{
			value: 'teal-700',
			label: 'Teal 700',
			description: '#0f766e',
			hexColor: '#0f766e',
		},
		{
			value: 'teal-800',
			label: 'Teal 800',
			description: '#115e59',
			hexColor: '#115e59',
		},
		{
			value: 'teal-900',
			label: 'Teal 900',
			description: '#134e4a',
			hexColor: '#134e4a',
		},
	];

	return colors.filter(
		(item) =>
			item.value.toLowerCase().includes(query.toLowerCase()) ||
			item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for tag patterns
 */
export const getTagCompletions = (query: string): CompletionItem[] => {
	const commonTags = [
		{ value: 'todo', label: 'Todo', description: 'Task to do' },
		{ value: 'urgent', label: 'Urgent', description: 'Urgent item' },
		{ value: 'meeting', label: 'Meeting', description: 'Meeting related' },
		{ value: 'review', label: 'Review', description: 'Needs review' },
		{ value: 'bug', label: 'Bug', description: 'Bug report' },
		{ value: 'feature', label: 'Feature', description: 'Feature request' },
		{ value: 'docs', label: 'Docs', description: 'Documentation' },
		{ value: 'testing', label: 'Testing', description: 'Testing related' },
		{ value: 'blocked', label: 'Blocked', description: 'Blocked item' },
		{
			value: 'in-progress',
			label: 'In Progress',
			description: 'Currently working on',
		},
	];

	return commonTags.filter(
		(item) =>
			item.value.toLowerCase().includes(query.toLowerCase()) ||
			item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for font size patterns
 */
export const getFontSizeCompletions = (query: string): CompletionItem[] => {
	const fontSizes = [
		{ value: '8px', label: '8px', description: 'Very small' },
		{ value: '10px', label: '10px', description: 'Small' },
		{ value: '12px', label: '12px', description: 'Default' },
		{ value: '14px', label: '14px', description: 'Medium' },
		{ value: '16px', label: '16px', description: 'Large' },
		{ value: '18px', label: '18px', description: 'Larger' },
		{ value: '20px', label: '20px', description: 'X-Large' },
		{ value: '24px', label: '24px', description: 'XX-Large' },
		{ value: '32px', label: '32px', description: 'Huge' },
		{ value: '0.8rem', label: '0.8rem', description: 'Small (rem)' },
		{ value: '1rem', label: '1rem', description: 'Default (rem)' },
		{ value: '1.2rem', label: '1.2rem', description: 'Large (rem)' },
		{ value: '1.5rem', label: '1.5rem', description: 'X-Large (rem)' },
		{ value: '2rem', label: '2rem', description: 'XX-Large (rem)' },
	];

	return fontSizes.filter(
		(item) =>
			item.value.toLowerCase().includes(query.toLowerCase()) ||
			item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for assignee patterns
 */
export const getAssigneeCompletions = (query: string): CompletionItem[] => {
	const commonAssignees = [
		{ value: 'me', label: 'Me', description: 'Assigned to me' },
		{ value: 'team', label: 'Team', description: 'Assigned to team' },
		{ value: 'admin', label: 'Admin', description: 'Assigned to admin' },
		{ value: 'lead', label: 'Lead', description: 'Assigned to lead' },
		{ value: 'qa', label: 'QA', description: 'Assigned to QA' },
		{ value: 'dev', label: 'Dev', description: 'Assigned to developer' },
	];

	return commonAssignees.filter(
		(item) =>
			item.value.toLowerCase().includes(query.toLowerCase()) ||
			item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for a specific pattern type
 */
export const getCompletionsForPattern = (
	patternType: string,
	query: string
): CompletionItem[] => {
	switch (patternType) {
		case 'date':
			return getDateCompletions(query);
		case 'priority':
			return getPriorityCompletions(query);
		case 'color':
			return getColorCompletions(query);
		case 'tag':
			return getTagCompletions(query);
		case 'assignee':
			return getAssigneeCompletions(query);
		case 'fontSize':
			return getFontSizeCompletions(query);
		default:
			return [];
	}
};

/**
 * Universal completion source for CodeMirror
 * Detects patterns and provides appropriate completions with improved pattern detection
 */
export const universalCompletionSource = (context: any) => {
	const text = context.state.doc.toString();
	const cursor = context.pos;

	// Look at text before cursor to find pattern triggers
	const beforeCursor = text.slice(Math.max(0, cursor - 20), cursor);

	// Define pattern matchers with their triggers and word boundaries
	const patternMatchers = [
		{
			pattern: /\^(\w*)$/,
			type: 'date',
			triggerLength: 1, // '^' character
		},
		{
			pattern: /#(\w*)$/,
			type: 'priority',
			triggerLength: 1, // '#' character
		},
		{
			pattern: /color:(\w*)$/,
			type: 'color',
			triggerLength: 6, // 'color:' length
		},
		{
			pattern: /sz:([\w.]*)$/,
			type: 'fontSize',
			triggerLength: 3, // 'sz:' length
		},
		{
			pattern: /@(\w*)$/,
			type: 'assignee',
			triggerLength: 1, // '@' character
		},
		{
			pattern: /\[([^\]]*?)$/,
			type: 'tag',
			triggerLength: 1, // '[' character
			validate: (match: RegExpMatchArray) => {
				// Exclude checkbox patterns
				const content = match[1];
				return !/^[xX\s,;]*$/.test(content);
			},
		},
	];

	// Find matching pattern
	let matchedPattern = null;
	let patternType = '';
	let matchResult = null;
	let queryStart = cursor;

	for (const matcher of patternMatchers) {
		const match = beforeCursor.match(matcher.pattern);

		if (match) {
			// Validate match if validator provided
			if (matcher.validate && !matcher.validate(match)) {
				continue;
			}

			matchedPattern = matcher;
			patternType = matcher.type;
			matchResult = match;
			queryStart = cursor - match[1].length; // Start of the query part (after trigger)
			break;
		}
	}

	if (!patternType || !matchResult) return null;

	const query = matchResult[1] || ''; // The query part after the trigger
	const completions = getCompletionsForPattern(patternType, query);

	if (completions.length === 0) return null;

	return {
		from: queryStart,
		options: completions.map((item) => ({
			label: item.value,
			detail: item.description,
			info: item.label,
			type: getCompletionType(patternType),
			section: {
				name: getPatternSectionName(patternType),
				rank: getPatternRank(patternType),
			},
			boost: getPatternBoost(patternType, item.value, query),
			// Store hex color data for use in addToOptions render function
			...(patternType === 'color' && item.hexColor
				? { hexColor: item.hexColor }
				: {}),
		})),
	};
};

/**
 * Get completion type for styling
 */
function getCompletionType(patternType: string): string {
	switch (patternType) {
		case 'date':
			return 'keyword';
		case 'priority':
			return 'variable';
		case 'color':
			return 'property';
		case 'tag':
			return 'type';
		case 'assignee':
			return 'function';
		case 'fontSize':
			return 'property';
		default:
			return 'text';
	}
}

/**
 * Get section name for grouping
 */
function getPatternSectionName(patternType: string): string {
	switch (patternType) {
		case 'date':
			return 'Dates';
		case 'priority':
			return 'Priority';
		case 'color':
			return 'Colors';
		case 'tag':
			return 'Tags';
		case 'assignee':
			return 'Assignees';
		case 'fontSize':
			return 'Font Sizes';
		default:
			return 'Patterns';
	}
}

/**
 * Get section rank for ordering (lower numbers appear first)
 */
function getPatternRank(patternType: string): number {
	switch (patternType) {
		case 'date':
			return 5;
		case 'priority':
			return 6;
		case 'assignee':
			return 7;
		case 'tag':
			return 8;
		case 'color':
			return 9;
		default:
			return 10;
	}
}

/**
 * Calculate boost for relevance sorting
 */
function getPatternBoost(
	patternType: string,
	value: string,
	query: string
): number {
	let boost = 0;

	// Exact match gets highest boost
	if (value.toLowerCase() === query.toLowerCase()) {
		boost += 100;
	}
	// Starts with query gets high boost
	else if (value.toLowerCase().startsWith(query.toLowerCase())) {
		boost += 50;
	}
	// Contains query gets medium boost
	else if (value.toLowerCase().includes(query.toLowerCase())) {
		boost += 25;
	}

	// Priority-specific boosts
	if (patternType === 'priority') {
		const priorityBoosts: Record<string, number> = {
			high: 10,
			urgent: 9,
			critical: 8,
			asap: 7,
			medium: 5,
			low: 3,
			blocked: 2,
			waiting: 1,
		};
		boost += priorityBoosts[value] || 0;
	}

	// Date-specific boosts
	if (patternType === 'date') {
		const dateBoosts: Record<string, number> = {
			today: 15,
			tomorrow: 10,
			yesterday: 5,
		};
		boost += dateBoosts[value] || 0;
	}

	return boost;
}

// Export as default for backward compatibility
export default universalCompletionSource;
