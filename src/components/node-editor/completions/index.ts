/**
 * Simple completion system for node editor
 * Provides basic completions for common patterns
 */

export interface CompletionItem {
	value: string;
	label: string;
	description?: string;
	category?: string;
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

	return dateKeywords.filter(item => 
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
		{ value: 'waiting', label: 'Waiting', description: 'Waiting for something' },
	];

	return priorities.filter(item => 
		item.value.toLowerCase().includes(query.toLowerCase()) ||
		item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for color patterns
 */
export const getColorCompletions = (query: string): CompletionItem[] => {
	const colors = [
		{ value: 'red', label: 'Red', description: '#FF0000' },
		{ value: 'blue', label: 'Blue', description: '#0000FF' },
		{ value: 'green', label: 'Green', description: '#008000' },
		{ value: 'yellow', label: 'Yellow', description: '#FFFF00' },
		{ value: 'orange', label: 'Orange', description: '#FFA500' },
		{ value: 'purple', label: 'Purple', description: '#800080' },
		{ value: 'pink', label: 'Pink', description: '#FFC0CB' },
		{ value: 'black', label: 'Black', description: '#000000' },
		{ value: 'white', label: 'White', description: '#FFFFFF' },
		{ value: 'gray', label: 'Gray', description: '#808080' },
		{ value: '#ff0000', label: 'Red Hex', description: 'Red color' },
		{ value: '#00ff00', label: 'Green Hex', description: 'Green color' },
		{ value: '#0000ff', label: 'Blue Hex', description: 'Blue color' },
	];

	return colors.filter(item => 
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
		{ value: 'in-progress', label: 'In Progress', description: 'Currently working on' },
	];

	return commonTags.filter(item => 
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

	return commonAssignees.filter(item => 
		item.value.toLowerCase().includes(query.toLowerCase()) ||
		item.label.toLowerCase().includes(query.toLowerCase())
	);
};

/**
 * Get completions for a specific pattern type
 */
export const getCompletionsForPattern = (patternType: string, query: string): CompletionItem[] => {
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
			pattern: /@(\w*)$/,
			type: 'date',
			triggerLength: 1 // '@' character
		},
		{
			pattern: /#(\w*)$/,
			type: 'priority',
			triggerLength: 1 // '#' character
		},
		{
			pattern: /color:(\w*)$/,
			type: 'color',
			triggerLength: 6 // 'color:' length
		},
		{
			pattern: /\+(\w*)$/,
			type: 'assignee',
			triggerLength: 1 // '+' character
		},
		{
			pattern: /\[([^\]]*?)$/,
			type: 'tag',
			triggerLength: 1, // '[' character
			validate: (match: RegExpMatchArray) => {
				// Exclude checkbox patterns
				const content = match[1];
				return !/^[xX\s,;]*$/.test(content);
			}
		}
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
		options: completions.map(item => ({
			label: item.value,
			detail: item.description,
			info: item.label,
			type: getCompletionType(patternType),
			section: {
				name: getPatternSectionName(patternType),
				rank: getPatternRank(patternType)
			},
			boost: getPatternBoost(patternType, item.value, query)
		}))
	};
};

/**
 * Get completion type for styling
 */
function getCompletionType(patternType: string): string {
	switch (patternType) {
		case 'date': return 'keyword';
		case 'priority': return 'variable';
		case 'color': return 'property';
		case 'tag': return 'type';
		case 'assignee': return 'function';
		default: return 'text';
	}
}

/**
 * Get section name for grouping
 */
function getPatternSectionName(patternType: string): string {
	switch (patternType) {
		case 'date': return 'Dates';
		case 'priority': return 'Priority';
		case 'color': return 'Colors';
		case 'tag': return 'Tags';
		case 'assignee': return 'Assignees';
		default: return 'Patterns';
	}
}

/**
 * Get section rank for ordering (lower numbers appear first)
 */
function getPatternRank(patternType: string): number {
	switch (patternType) {
		case 'date': return 5;
		case 'priority': return 6;
		case 'assignee': return 7;
		case 'tag': return 8;
		case 'color': return 9;
		default: return 10;
	}
}

/**
 * Calculate boost for relevance sorting
 */
function getPatternBoost(patternType: string, value: string, query: string): number {
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
			'high': 10, 'urgent': 9, 'critical': 8, 'asap': 7,
			'medium': 5, 'low': 3, 'blocked': 2, 'waiting': 1
		};
		boost += priorityBoosts[value] || 0;
	}
	
	// Date-specific boosts
	if (patternType === 'date') {
		const dateBoosts: Record<string, number> = {
			'today': 15, 'tomorrow': 10, 'yesterday': 5
		};
		boost += dateBoosts[value] || 0;
	}
	
	return boost;
}

// Export as default for backward compatibility
export default universalCompletionSource;