/**
 * Completion providers index
 * Centralized access to all completion providers
 */

// Export completion providers
export * from './color-completion-provider';
export * from './priority-completion-provider';

// Import for unified access
import { colorCompletions, getColorCompletions } from './color-completion-provider';
import { priorityCompletions, getPriorityCompletions } from './priority-completion-provider';
import type { CompletionItem } from '../../utils/completion-types';

// Quick completions for common patterns
export const dateCompletions: CompletionItem[] = [
	{ value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
	{ value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick' },
	{ value: 'yesterday', label: 'Yesterday', description: 'Previous day', category: 'Quick' },
	{ value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekday' },
	{ value: 'tuesday', label: 'Tuesday', description: 'Next Tuesday', category: 'Weekday' },
	{ value: 'wednesday', label: 'Wednesday', description: 'Next Wednesday', category: 'Weekday' },
	{ value: 'thursday', label: 'Thursday', description: 'Next Thursday', category: 'Weekday' },
	{ value: 'friday', label: 'Friday', description: 'Next Friday', category: 'Weekday' },
	{ value: 'saturday', label: 'Saturday', description: 'Next Saturday', category: 'Weekday' },
	{ value: 'sunday', label: 'Sunday', description: 'Next Sunday', category: 'Weekday' },
];

export const commonTagCompletions: CompletionItem[] = [
	{ value: 'important', label: 'Important', description: 'High importance item', category: 'Priority' },
	{ value: 'urgent', label: 'Urgent', description: 'Time sensitive', category: 'Priority' },
	{ value: 'work', label: 'Work', description: 'Work related', category: 'Context' },
	{ value: 'personal', label: 'Personal', description: 'Personal task', category: 'Context' },
	{ value: 'meeting', label: 'Meeting', description: 'Meeting related', category: 'Activity' },
	{ value: 'todo', label: 'TODO', description: 'To do item', category: 'Status' },
	{ value: 'idea', label: 'Idea', description: 'New idea or concept', category: 'Type' },
	{ value: 'bug', label: 'Bug', description: 'Bug or issue', category: 'Type' },
	{ value: 'feature', label: 'Feature', description: 'Feature request', category: 'Type' },
];

export const assigneeCompletions: CompletionItem[] = [
	{ value: 'me', label: 'Me', description: 'Assign to self', category: 'Personal' },
	{ value: 'team', label: 'Team', description: 'Assign to team', category: 'Group' },
	{ value: 'admin', label: 'Admin', description: 'System administrator', category: 'Role' },
	{ value: 'user', label: 'User', description: 'Generic user', category: 'Generic' },
];

/**
 * Completion registry mapping pattern types to their completions
 */
export const completionRegistry = {
	color: colorCompletions,
	priority: priorityCompletions,
	date: dateCompletions,
	tag: commonTagCompletions,
	assignee: assigneeCompletions,
};

/**
 * Get completions for a specific pattern type
 */
export const getCompletionsForPattern = (patternType: keyof typeof completionRegistry): CompletionItem[] => {
	return completionRegistry[patternType] || [];
};

/**
 * Search completions across all pattern types
 */
export const searchAllCompletions = (query: string, limit: number = 10): CompletionItem[] => {
	const lowerQuery = query.toLowerCase();
	const allCompletions = Object.values(completionRegistry).flat();
	
	return allCompletions
		.filter(item => 
			item.value.toLowerCase().includes(lowerQuery) ||
			item.label.toLowerCase().includes(lowerQuery) ||
			item.description?.toLowerCase().includes(lowerQuery)
		)
		.slice(0, limit);
};

// Re-export specific completion arrays for backward compatibility
export {
	colorCompletions,
	priorityCompletions,
	dateCompletions,
	commonTagCompletions,
	assigneeCompletions
};