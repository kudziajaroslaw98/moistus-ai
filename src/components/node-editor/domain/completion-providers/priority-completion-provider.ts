/**
 * Priority completion provider
 * Provides priority suggestions for #priority patterns
 */

import type { CompletionItem } from '../../utils/completion-types';

export const priorityCompletions: CompletionItem[] = [
	{ value: 'critical', label: 'Critical', description: 'Highest priority - immediate action', category: 'Urgency' },
	{ value: 'high', label: 'High', description: 'High priority - important', category: 'Urgency' },
	{ value: 'medium', label: 'Medium', description: 'Medium priority - normal', category: 'Urgency' },
	{ value: 'low', label: 'Low', description: 'Low priority - when time permits', category: 'Urgency' },
	{ value: 'urgent', label: 'Urgent', description: 'Urgent - time sensitive', category: 'Urgency' },
	{ value: 'asap', label: 'ASAP', description: 'As soon as possible', category: 'Urgency' },
	{ value: 'blocked', label: 'Blocked', description: 'Cannot proceed - blocked', category: 'Status' },
	{ value: 'waiting', label: 'Waiting', description: 'Waiting for external input', category: 'Status' },
	{ value: 'review', label: 'Review', description: 'Needs review or approval', category: 'Status' },
	{ value: 'done', label: 'Done', description: 'Completed task', category: 'Status' },
	{ value: 'todo', label: 'TODO', description: 'To be done', category: 'Status' },
	{ value: 'next', label: 'Next', description: 'Next action item', category: 'Planning' },
	{ value: 'later', label: 'Later', description: 'Defer to later', category: 'Planning' },
];

export const getPriorityCompletions = (): CompletionItem[] => priorityCompletions;

export const searchPriorityCompletions = (query: string): CompletionItem[] => {
	const lowerQuery = query.toLowerCase();
	return priorityCompletions.filter(priority => 
		priority.value.toLowerCase().includes(lowerQuery) ||
		priority.label.toLowerCase().includes(lowerQuery) ||
		priority.description?.toLowerCase().includes(lowerQuery)
	);
};