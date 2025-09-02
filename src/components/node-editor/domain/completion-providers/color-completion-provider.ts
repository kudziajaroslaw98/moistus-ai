/**
 * Color completion provider
 * Provides color suggestions and validation for color: patterns
 */

import type { CompletionItem } from '../../utils/completion-types';

export const colorCompletions: CompletionItem[] = [
	// Brand colors
	{ value: '#10b981', label: 'Emerald', description: 'Primary green', category: 'Brand' },
	{ value: '#0891b2', label: 'Cyan', description: 'Primary blue', category: 'Brand' },
	{ value: '#7c3aed', label: 'Violet', description: 'Primary purple', category: 'Brand' },
	{ value: '#dc2626', label: 'Red', description: 'Danger/High priority', category: 'Brand' },
	{ value: '#ea580c', label: 'Orange', description: 'Warning/Medium priority', category: 'Brand' },
	
	// Common web colors
	{ value: '#ffffff', label: 'White', description: 'Pure white', category: 'Basic' },
	{ value: '#000000', label: 'Black', description: 'Pure black', category: 'Basic' },
	{ value: '#ef4444', label: 'Red', description: 'Bright red', category: 'Basic' },
	{ value: '#22c55e', label: 'Green', description: 'Bright green', category: 'Basic' },
	{ value: '#3b82f6', label: 'Blue', description: 'Bright blue', category: 'Basic' },
	{ value: '#f59e0b', label: 'Yellow', description: 'Bright yellow', category: 'Basic' },
	{ value: '#8b5cf6', label: 'Purple', description: 'Bright purple', category: 'Basic' },
	{ value: '#06b6d4', label: 'Cyan', description: 'Bright cyan', category: 'Basic' },
	
	// Grays
	{ value: '#f8fafc', label: 'Gray 50', description: 'Very light gray', category: 'Grays' },
	{ value: '#e2e8f0', label: 'Gray 200', description: 'Light gray', category: 'Grays' },
	{ value: '#94a3b8', label: 'Gray 400', description: 'Medium gray', category: 'Grays' },
	{ value: '#475569', label: 'Gray 600', description: 'Dark gray', category: 'Grays' },
	{ value: '#1e293b', label: 'Gray 800', description: 'Very dark gray', category: 'Grays' },
];

export const getColorCompletions = (): CompletionItem[] => colorCompletions;

export const searchColorCompletions = (query: string): CompletionItem[] => {
	const lowerQuery = query.toLowerCase();
	return colorCompletions.filter(color => 
		color.label.toLowerCase().includes(lowerQuery) ||
		color.value.toLowerCase().includes(lowerQuery) ||
		color.category?.toLowerCase().includes(lowerQuery)
	);
};