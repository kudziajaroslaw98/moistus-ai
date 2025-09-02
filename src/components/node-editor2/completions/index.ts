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
 * Detects patterns and provides appropriate completions
 */
export const universalCompletionSource = (context: any) => {
	const word = context.matchBefore(/\w*/);
	if (!word) return null;

	const text = context.state.doc.toString();
	const cursor = context.pos;
	
	// Simple pattern detection
	let patternType = '';
	if (text.slice(cursor - 5, cursor).includes('@')) patternType = 'date';
	else if (text.slice(cursor - 5, cursor).includes('#')) patternType = 'priority';
	else if (text.slice(cursor - 8, cursor).includes('color:')) patternType = 'color';
	else if (text.slice(cursor - 5, cursor).includes('[')) patternType = 'tag';
	else if (text.slice(cursor - 5, cursor).includes('+')) patternType = 'assignee';

	if (!patternType) return null;

	const query = word.text;
	const completions = getCompletionsForPattern(patternType, query);

	return {
		from: word.from,
		options: completions.map(item => ({
			label: item.value,
			detail: item.description,
			info: item.label,
		}))
	};
};

// Export as default for backward compatibility
export default universalCompletionSource;