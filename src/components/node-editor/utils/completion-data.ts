/**
 * Static completion data for different pattern types
 * Enhanced universal completion system supporting all mindmap patterns
 */

import { 
	CompletionItem, 
	PatternType, 
	PatternContext,
	FuzzySearchConfig,
	DEFAULT_FUZZY_SEARCH_CONFIG,
	DatePatternSubtype,
	PartialDatePattern
} from './completion-types';

// Predefined colors for color: pattern completions
export const colorCompletions: CompletionItem[] = [
	// Brand colors (you can customize these)
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

// Date pattern completions - expanded with more options
export const dateCompletions: CompletionItem[] = [
	// Quick dates
	{ value: 'today', label: 'Today', description: 'Current date', category: 'Quick' },
	{ value: 'tomorrow', label: 'Tomorrow', description: 'Next day', category: 'Quick' },
	{ value: 'yesterday', label: 'Yesterday', description: 'Previous day', category: 'Quick' },
	
	// Weekdays
	{ value: 'monday', label: 'Monday', description: 'Next Monday', category: 'Weekdays' },
	{ value: 'tuesday', label: 'Tuesday', description: 'Next Tuesday', category: 'Weekdays' },
	{ value: 'wednesday', label: 'Wednesday', description: 'Next Wednesday', category: 'Weekdays' },
	{ value: 'thursday', label: 'Thursday', description: 'Next Thursday', category: 'Weekdays' },
	{ value: 'friday', label: 'Friday', description: 'Next Friday', category: 'Weekdays' },
	{ value: 'saturday', label: 'Saturday', description: 'Next Saturday', category: 'Weekdays' },
	{ value: 'sunday', label: 'Sunday', description: 'Next Sunday', category: 'Weekdays' },
	
	// Relative dates
	{ value: 'week', label: 'Next Week', description: 'One week from now', category: 'Relative' },
	{ value: 'month', label: 'Next Month', description: 'One month from now', category: 'Relative' },
	{ value: '2weeks', label: '2 Weeks', description: 'Two weeks from now', category: 'Relative' },
	{ value: '3weeks', label: '3 Weeks', description: 'Three weeks from now', category: 'Relative' },
	{ value: '2months', label: '2 Months', description: 'Two months from now', category: 'Relative' },
	{ value: '3months', label: '3 Months', description: 'Three months from now', category: 'Relative' },
	{ value: '6months', label: '6 Months', description: 'Six months from now', category: 'Relative' },
	{ value: 'year', label: 'Next Year', description: 'One year from now', category: 'Relative' },
	
	// Month names
	{ value: 'january', label: 'January', description: 'Next January', category: 'Months' },
	{ value: 'february', label: 'February', description: 'Next February', category: 'Months' },
	{ value: 'march', label: 'March', description: 'Next March', category: 'Months' },
	{ value: 'april', label: 'April', description: 'Next April', category: 'Months' },
	{ value: 'may', label: 'May', description: 'Next May', category: 'Months' },
	{ value: 'june', label: 'June', description: 'Next June', category: 'Months' },
	{ value: 'july', label: 'July', description: 'Next July', category: 'Months' },
	{ value: 'august', label: 'August', description: 'Next August', category: 'Months' },
	{ value: 'september', label: 'September', description: 'Next September', category: 'Months' },
	{ value: 'october', label: 'October', description: 'Next October', category: 'Months' },
	{ value: 'november', label: 'November', description: 'Next November', category: 'Months' },
	{ value: 'december', label: 'December', description: 'Next December', category: 'Months' },
	
	// Time periods
	{ value: 'weekend', label: 'Weekend', description: 'Next weekend', category: 'Periods' },
	{ value: 'end-of-month', label: 'End of Month', description: 'Last day of current month', category: 'Periods' },
	{ value: 'end-of-year', label: 'End of Year', description: 'Last day of current year', category: 'Periods' },
	{ value: 'quarter', label: 'Next Quarter', description: 'Beginning of next quarter', category: 'Periods' },
];

// Priority completions - expanded with more granular options
export const priorityCompletions: CompletionItem[] = [
	{ value: 'critical', label: 'Critical', description: 'Drop everything priority', category: 'Priority' },
	{ value: 'high', label: 'High Priority', description: 'Urgent task', category: 'Priority' },
	{ value: 'medium', label: 'Medium Priority', description: 'Moderate importance', category: 'Priority' },
	{ value: 'low', label: 'Low Priority', description: 'Non-urgent task', category: 'Priority' },
	{ value: 'none', label: 'No Priority', description: 'No specific priority', category: 'Priority' },
	
	// Alternative priority styles
	{ value: 'urgent', label: 'Urgent', description: 'Needs immediate attention', category: 'Status' },
	{ value: 'asap', label: 'ASAP', description: 'As soon as possible', category: 'Status' },
	{ value: 'blocked', label: 'Blocked', description: 'Cannot proceed', category: 'Status' },
	{ value: 'waiting', label: 'Waiting', description: 'Waiting for something', category: 'Status' },
	{ value: 'someday', label: 'Someday', description: 'Future consideration', category: 'Status' },
];

// Common tag suggestions - greatly expanded with more categories
export const commonTagCompletions: CompletionItem[] = [
	// Work-related tags
	{ value: 'meeting', label: 'Meeting', description: 'Meeting-related item', category: 'Work' },
	{ value: 'project', label: 'Project', description: 'Project-related', category: 'Work' },
	{ value: 'task', label: 'Task', description: 'Specific work task', category: 'Work' },
	{ value: 'deadline', label: 'Deadline', description: 'Has a specific deadline', category: 'Work' },
	{ value: 'milestone', label: 'Milestone', description: 'Project milestone', category: 'Work' },
	{ value: 'review', label: 'Review', description: 'Needs review or approval', category: 'Work' },
	{ value: 'research', label: 'Research', description: 'Research required', category: 'Work' },
	{ value: 'planning', label: 'Planning', description: 'Planning activity', category: 'Work' },
	{ value: 'presentation', label: 'Presentation', description: 'Presentation-related', category: 'Work' },
	{ value: 'client', label: 'Client', description: 'Client-related', category: 'Work' },
	{ value: 'budget', label: 'Budget', description: 'Budget consideration', category: 'Work' },
	{ value: 'training', label: 'Training', description: 'Learning or training', category: 'Work' },
	
	// Status tags
	{ value: 'todo', label: 'Todo', description: 'Action item to complete', category: 'Status' },
	{ value: 'done', label: 'Done', description: 'Completed item', category: 'Status' },
	{ value: 'urgent', label: 'Urgent', description: 'Requires immediate attention', category: 'Status' },
	{ value: 'important', label: 'Important', description: 'High importance', category: 'Status' },
	{ value: 'blocked', label: 'Blocked', description: 'Waiting on something', category: 'Status' },
	{ value: 'waiting', label: 'Waiting', description: 'Waiting for response', category: 'Status' },
	{ value: 'progress', label: 'In Progress', description: 'Currently working on', category: 'Status' },
	{ value: 'followup', label: 'Follow-up', description: 'Needs follow-up action', category: 'Status' },
	{ value: 'on-hold', label: 'On Hold', description: 'Temporarily paused', category: 'Status' },
	{ value: 'cancelled', label: 'Cancelled', description: 'No longer needed', category: 'Status' },
	
	// Content types
	{ value: 'idea', label: 'Idea', description: 'Creative or strategic idea', category: 'Content' },
	{ value: 'note', label: 'Note', description: 'General note', category: 'Content' },
	{ value: 'question', label: 'Question', description: 'Requires clarification', category: 'Content' },
	{ value: 'decision', label: 'Decision', description: 'Decision to be made', category: 'Content' },
	{ value: 'reference', label: 'Reference', description: 'Reference material', category: 'Content' },
	{ value: 'draft', label: 'Draft', description: 'Draft content', category: 'Content' },
	{ value: 'template', label: 'Template', description: 'Template or pattern', category: 'Content' },
	{ value: 'example', label: 'Example', description: 'Example or sample', category: 'Content' },
	
	// Personal tags
	{ value: 'personal', label: 'Personal', description: 'Personal item', category: 'Personal' },
	{ value: 'health', label: 'Health', description: 'Health-related', category: 'Personal' },
	{ value: 'family', label: 'Family', description: 'Family-related', category: 'Personal' },
	{ value: 'hobby', label: 'Hobby', description: 'Hobby or interest', category: 'Personal' },
	{ value: 'finance', label: 'Finance', description: 'Financial matter', category: 'Personal' },
	{ value: 'travel', label: 'Travel', description: 'Travel-related', category: 'Personal' },
	{ value: 'shopping', label: 'Shopping', description: 'Shopping list item', category: 'Personal' },
	{ value: 'home', label: 'Home', description: 'Home-related task', category: 'Personal' },
	
	// Learning and development
	{ value: 'learning', label: 'Learning', description: 'Learning activity', category: 'Development' },
	{ value: 'skill', label: 'Skill', description: 'Skill development', category: 'Development' },
	{ value: 'course', label: 'Course', description: 'Course or education', category: 'Development' },
	{ value: 'book', label: 'Book', description: 'Book or reading', category: 'Development' },
	{ value: 'article', label: 'Article', description: 'Article to read', category: 'Development' },
	{ value: 'video', label: 'Video', description: 'Video to watch', category: 'Development' },
	
	// Technology
	{ value: 'bug', label: 'Bug', description: 'Bug or issue', category: 'Tech' },
	{ value: 'feature', label: 'Feature', description: 'New feature', category: 'Tech' },
	{ value: 'improvement', label: 'Improvement', description: 'Enhancement', category: 'Tech' },
	{ value: 'documentation', label: 'Documentation', description: 'Documentation work', category: 'Tech' },
	{ value: 'testing', label: 'Testing', description: 'Testing activity', category: 'Tech' },
	{ value: 'deployment', label: 'Deployment', description: 'Deployment task', category: 'Tech' },
	{ value: 'maintenance', label: 'Maintenance', description: 'Maintenance work', category: 'Tech' },
	{ value: 'refactor', label: 'Refactor', description: 'Code refactoring', category: 'Tech' },
];

// Assignee completions - common username patterns and roles
export const assigneeCompletions: CompletionItem[] = [
	// Common first names
	{ value: 'john', label: 'John', description: 'Assign to John', category: 'Team' },
	{ value: 'sarah', label: 'Sarah', description: 'Assign to Sarah', category: 'Team' },
	{ value: 'mike', label: 'Mike', description: 'Assign to Mike', category: 'Team' },
	{ value: 'jane', label: 'Jane', description: 'Assign to Jane', category: 'Team' },
	{ value: 'alex', label: 'Alex', description: 'Assign to Alex', category: 'Team' },
	{ value: 'chris', label: 'Chris', description: 'Assign to Chris', category: 'Team' },
	{ value: 'anna', label: 'Anna', description: 'Assign to Anna', category: 'Team' },
	{ value: 'david', label: 'David', description: 'Assign to David', category: 'Team' },
	{ value: 'lisa', label: 'Lisa', description: 'Assign to Lisa', category: 'Team' },
	{ value: 'tom', label: 'Tom', description: 'Assign to Tom', category: 'Team' },
	
	// Common full name patterns
	{ value: 'john.doe', label: 'John Doe', description: 'Assign to John Doe', category: 'Team' },
	{ value: 'sarah.smith', label: 'Sarah Smith', description: 'Assign to Sarah Smith', category: 'Team' },
	{ value: 'mike.johnson', label: 'Mike Johnson', description: 'Assign to Mike Johnson', category: 'Team' },
	{ value: 'jane.wilson', label: 'Jane Wilson', description: 'Assign to Jane Wilson', category: 'Team' },
	{ value: 'alex.brown', label: 'Alex Brown', description: 'Assign to Alex Brown', category: 'Team' },
	
	// Role-based assignments
	{ value: 'manager', label: 'Manager', description: 'Assign to manager', category: 'Roles' },
	{ value: 'team-lead', label: 'Team Lead', description: 'Assign to team lead', category: 'Roles' },
	{ value: 'developer', label: 'Developer', description: 'Assign to developer', category: 'Roles' },
	{ value: 'designer', label: 'Designer', description: 'Assign to designer', category: 'Roles' },
	{ value: 'qa', label: 'QA', description: 'Assign to QA team', category: 'Roles' },
	{ value: 'product-owner', label: 'Product Owner', description: 'Assign to product owner', category: 'Roles' },
	{ value: 'scrum-master', label: 'Scrum Master', description: 'Assign to scrum master', category: 'Roles' },
	{ value: 'architect', label: 'Architect', description: 'Assign to architect', category: 'Roles' },
	{ value: 'admin', label: 'Admin', description: 'Assign to admin', category: 'Roles' },
	{ value: 'support', label: 'Support', description: 'Assign to support team', category: 'Roles' },
	
	// Department assignments
	{ value: 'frontend', label: 'Frontend Team', description: 'Assign to frontend team', category: 'Teams' },
	{ value: 'backend', label: 'Backend Team', description: 'Assign to backend team', category: 'Teams' },
	{ value: 'devops', label: 'DevOps Team', description: 'Assign to DevOps team', category: 'Teams' },
	{ value: 'design', label: 'Design Team', description: 'Assign to design team', category: 'Teams' },
	{ value: 'marketing', label: 'Marketing Team', description: 'Assign to marketing team', category: 'Teams' },
	{ value: 'sales', label: 'Sales Team', description: 'Assign to sales team', category: 'Teams' },
	{ value: 'hr', label: 'HR Team', description: 'Assign to HR team', category: 'Teams' },
	{ value: 'finance', label: 'Finance Team', description: 'Assign to finance team', category: 'Teams' },
	
	// Special assignees
	{ value: 'me', label: 'Me', description: 'Assign to myself', category: 'Special' },
	{ value: 'unassigned', label: 'Unassigned', description: 'Remove assignment', category: 'Special' },
	{ value: 'anyone', label: 'Anyone', description: 'Anyone can take this', category: 'Special' },
	{ value: 'team', label: 'Team', description: 'Assign to entire team', category: 'Special' },
];

/**
 * Pattern detection utilities for context-aware completion switching
 */

// Pattern matching regex definitions
const PATTERN_REGEXES = {
	date: /@([^@\s]*)$/,
	priority: /#([^#\s]*)$/,
	color: /color:([^:\s]*)$/,
	tag: /\[([^\[\]]*)$/,
	assignee: /\+([^+\s]*)$/,
} as const;

// Enhanced date pattern regexes for more specific matching
const DATE_PATTERN_REGEXES = {
	// Full date patterns: @2025-01-15, @2024-12-31, etc. (complete 2-digit day)
	fullDate: /@(\d{4}-\d{1,2}-\d{2})$/,
	// Partial date patterns: @2025-10-, @2024-02-, @2025-10-2 (single digit day or trailing dash)
	partialDate: /@(\d{4}-\d{1,2}(?:-\d{1}|-))$/,
	// Word-based date patterns: @tod, @tom, @mon, etc.
	wordDate: /@([a-zA-Z][^@\s]*)$/,
} as const;

/**
 * Utility functions for date handling
 */

/**
 * Determines if a year is a leap year
 */
const isLeapYear = (year: number): boolean => {
	return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Gets the number of days in a given month/year combination
 */
const getDaysInMonth = (year: number, month: number): number => {
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	if (month === 2 && isLeapYear(year)) {
		return 29;
	}
	return daysInMonth[month - 1] || 31;
};

/**
 * Parses a partial date pattern and extracts date components
 */
const parsePartialDatePattern = (query: string): PartialDatePattern | null => {
	// Match patterns like "2025-10-", "2024-02", "2025-10-2", etc.
	const match = query.match(/^(\d{4})-(\d{1,2})(?:-(\d{0,1}))?$/);
	if (!match) return null;
	
	const year = parseInt(match[1], 10);
	const month = parseInt(match[2], 10);
	const partialDay = match[3];
	
	// Validate year and month
	const isValid = year >= 1000 && year <= 9999 && month >= 1 && month <= 12;
	const daysInMonth = isValid ? getDaysInMonth(year, month) : undefined;
	
	return {
		year: match[1],
		month: match[2],
		partialDay: partialDay || undefined,
		isComplete: false,
		isValid,
		daysInMonth,
	};
};

/**
 * Determines the date pattern subtype from the query
 */
const getDatePatternSubtype = (query: string): DatePatternSubtype => {
	// Test full date first since it's more specific
	if (DATE_PATTERN_REGEXES.fullDate.test(`@${query}`)) {
		return 'full-date';
	}
	if (DATE_PATTERN_REGEXES.partialDate.test(`@${query}`)) {
		return 'partial-date';
	}
	return 'word';
};

/**
 * Generates dynamic day number completions for partial date patterns
 */
const generateDayCompletions = (partialDate: PartialDatePattern): CompletionItem[] => {
	if (!partialDate.isValid || !partialDate.daysInMonth) {
		return [];
	}
	
	const completions: CompletionItem[] = [];
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	
	const monthName = monthNames[parseInt(partialDate.month, 10) - 1];
	
	for (let day = 1; day <= partialDate.daysInMonth; day++) {
		const paddedDay = day.toString().padStart(2, '0');
		completions.push({
			value: `${partialDate.year}-${partialDate.month.padStart(2, '0')}-${paddedDay}`,
			label: `${day}`,
			description: `${monthName} ${day}, ${partialDate.year}`,
			category: 'Days',
		});
	}
	
	return completions;
};

/**
 * Detects the current pattern type and context from text before cursor
 */
export const detectPatternContext = (textBefore: string): PatternContext | null => {
	// Try date pattern first with enhanced detection
	const dateMatch = textBefore.match(PATTERN_REGEXES.date);
	if (dateMatch) {
		const query = dateMatch[1] || '';
		const matchStart = textBefore.lastIndexOf(dateMatch[0]);
		const matchEnd = matchStart + dateMatch[0].length;
		
		const dateSubtype = getDatePatternSubtype(query);
		const partialDate = dateSubtype === 'partial-date' ? parsePartialDatePattern(query) : undefined;
		
		return {
			type: 'date',
			pattern: dateMatch[0],
			query,
			matchStart,
			matchEnd,
			dateSubtype,
			partialDate,
		};
	}
	
	// Try other pattern types in order of specificity
	for (const [type, regex] of Object.entries(PATTERN_REGEXES)) {
		if (type === 'date') continue; // Already handled above
		
		const match = textBefore.match(regex);
		if (match) {
			let query = match[1] || '';
			let matchStart = textBefore.lastIndexOf(match[0]);
			let matchEnd = matchStart + match[0].length;
			
			// Special handling for tag patterns containing commas
			if (type === 'tag' && query.includes(',')) {
				const parts = query.split(',');
				const currentTag = parts[parts.length - 1].trim();
				
				// Update query to just the current tag being typed
				query = currentTag;
				
				// Adjust match positions to target only the current tag
				const fullTagContent = match[1];
				const currentTagStart = fullTagContent.lastIndexOf(currentTag);
				matchStart = matchStart + 1 + currentTagStart; // +1 for the opening bracket
				matchEnd = matchStart + currentTag.length;
			}
			
			return {
				type: type as PatternType,
				pattern: match[0],
				query,
				matchStart,
				matchEnd,
			};
		}
	}
	
	return null;
};

/**
 * Gets completion items for a specific pattern type with enhanced date support
 */
export const getCompletionItemsForPattern = (
	type: PatternType, 
	context?: PatternContext
): CompletionItem[] => {
	switch (type) {
		case 'date':
			// Handle enhanced date completions based on subtype
			if (context?.dateSubtype === 'partial-date' && context.partialDate) {
				return generateDayCompletions(context.partialDate);
			}
			// For word-based dates or when no specific context, return static completions
			return dateCompletions;
		case 'priority':
			return priorityCompletions;
		case 'color':
			return colorCompletions;
		case 'tag':
			return commonTagCompletions;
		case 'assignee':
			return assigneeCompletions;
		default:
			return [];
	}
};

/**
 * Filters day completions based on partial day input
 * For input like "2025-10-2", should return days 20-29
 */
const filterDaysByPartialInput = (dayCompletions: CompletionItem[], partialInput: string): CompletionItem[] => {
	// Check if the partialInput ends with a digit (indicating partial day typing)
	const dayPartialMatch = partialInput.match(/(\d{4})-(\d{1,2})-(\d+)$/);
	if (!dayPartialMatch) {
		return dayCompletions; // No partial day filtering needed
	}
	
	const partialDay = dayPartialMatch[3]; // The partial day part like "2" from "2025-10-2"
	
	// If partial day is empty or single character, filter to matching days
	if (partialDay.length >= 1) {
		return dayCompletions.filter(dayItem => {
			// Extract day number from the completion label
			const dayNumber = dayItem.label;
			
			// Check if day starts with the partial input
			return dayNumber.startsWith(partialDay);
		});
	}
	
	return dayCompletions;
};

/**
 * Enhanced fuzzy search with pattern-specific scoring and date context awareness
 */
export const fuzzySearchWithPatternScoring = (
	query: string, 
	items: CompletionItem[], 
	patternType: PatternType,
	limit: number = 10,
	context?: PatternContext
): CompletionItem[] => {
	if (!query.trim()) return items.slice(0, limit);
	
	const lowerQuery = query.toLowerCase();
	let filteredItems = items;
	
	// Special filtering for date patterns with partial day input
	// This applies to both 'partial-date' and 'full-date' patterns that contain single-digit days
	if (patternType === 'date') {
		// Check if the query ends with a partial day pattern like "2025-10-2"
		const partialDayMatch = query.match(/(\d{4})-(\d{1,2})-(\d+)$/);
		if (partialDayMatch && items.length > 0 && items[0].category === 'Days') {
			// Apply dynamic day filtering
			filteredItems = filterDaysByPartialInput(items, query);
			
			// If we filtered out all items, fall back to original items
			if (filteredItems.length === 0) {
				filteredItems = items;
			}
		}
	}
	
	// Score items based on match quality with pattern-specific boosts
	const scored = filteredItems.map(item => {
		const lowerLabel = item.label.toLowerCase();
		const lowerValue = item.value.toLowerCase();
		
		let score = 0;
		
		// For date patterns with partial day input, use different scoring logic
		if (patternType === 'date' && item.category === 'Days') {
			// For day completions, score based on how well the day matches the partial input
			const partialDayMatch = query.match(/(\d{4})-(\d{1,2})-(\d+)$/);
			if (partialDayMatch) {
				const partialDay = partialDayMatch[3];
				const dayLabel = item.label;
				
				// Exact match for day gets highest score
				if (dayLabel === partialDay) {
					score = 1000;
				}
				// Starts with partial day gets high score
				else if (dayLabel.startsWith(partialDay)) {
					score = 100;
					// Boost single-digit days for easier selection
					if (parseInt(dayLabel, 10) <= 9) {
						score += 20;
					}
				}
				// Otherwise, no match
				else {
					score = 0;
				}
			}
		} else {
			// Standard fuzzy matching logic for non-day completions
			// Exact match gets highest score
			if (lowerValue === lowerQuery || lowerLabel === lowerQuery) {
				score = 1000;
			}
			// Starts with query gets high score
			else if (lowerValue.startsWith(lowerQuery) || lowerLabel.startsWith(lowerQuery)) {
				score = 100;
			}
			// Contains query gets medium score
			else if (lowerValue.includes(lowerQuery) || lowerLabel.includes(lowerQuery)) {
				score = 50;
			}
			// Fuzzy matching (characters in order) gets low score
			else {
				const chars = lowerQuery.split('');
				let pos = 0;
				let fuzzyMatches = 0;
				
				for (const char of chars) {
					const foundIndex = lowerValue.indexOf(char, pos);
					if (foundIndex >= 0) {
						fuzzyMatches++;
						pos = foundIndex + 1;
					}
				}
				
				if (fuzzyMatches === chars.length) {
					score = 10;
				}
			}
		}
		
		// Pattern-specific scoring boosts
		if (score > 0) {
			switch (patternType) {
				case 'date':
					// For day completions, boost common days
					if (item.category === 'Days') {
						// Boost common days (1st, 15th, 30th/31st) but only if they match the filter
						if (['1', '15', '30', '31'].includes(item.label)) {
							score += 15;
						}
					} else {
						// Boost relative dates like "today", "tomorrow" for word patterns
						if (['today', 'tomorrow', 'yesterday'].includes(lowerValue)) {
							score += 50;
						}
					}
					break;
				case 'priority':
					// Boost common priorities
					if (['high', 'medium', 'low', 'critical'].includes(lowerValue)) {
						score += 30;
					}
					break;
				case 'color':
					// Boost basic colors
					if (item.category === 'Basic') {
						score += 20;
					}
					break;
				case 'tag':
					// Boost common status tags
					if (item.category === 'Status') {
						score += 15;
					}
					break;
				case 'assignee':
					// Boost role-based assignments
					if (item.category === 'Roles') {
						score += 25;
					}
					break;
			}
		}
		
		return { ...item, score };
	});
	
	// Filter out non-matches and sort by score
	return scored
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ score, ...item }) => item);
};

// Legacy fuzzy search function for completions (kept for backwards compatibility)
export const fuzzySearch = (query: string, items: CompletionItem[], limit: number = 10): CompletionItem[] => {
	if (!query.trim()) return items.slice(0, limit);
	
	const lowerQuery = query.toLowerCase();
	
	// Score items based on match quality
	const scored = items.map(item => {
		const lowerLabel = item.label.toLowerCase();
		const lowerValue = item.value.toLowerCase();
		
		let score = 0;
		
		// Exact match gets highest score
		if (lowerValue === lowerQuery || lowerLabel === lowerQuery) {
			score = 1000;
		}
		// Starts with query gets high score
		else if (lowerValue.startsWith(lowerQuery) || lowerLabel.startsWith(lowerQuery)) {
			score = 100;
		}
		// Contains query gets medium score
		else if (lowerValue.includes(lowerQuery) || lowerLabel.includes(lowerQuery)) {
			score = 50;
		}
		// Fuzzy matching (characters in order) gets low score
		else {
			const chars = lowerQuery.split('');
			let pos = 0;
			let fuzzyMatches = 0;
			
			for (const char of chars) {
				const foundIndex = lowerValue.indexOf(char, pos);
				if (foundIndex >= 0) {
					fuzzyMatches++;
					pos = foundIndex + 1;
				}
			}
			
			if (fuzzyMatches === chars.length) {
				score = 10;
			}
		}
		
		return { ...item, score };
	});
	
	// Filter out non-matches and sort by score
	return scored
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ score, ...item }) => item);
};
/**
 * Enhanced completion item generation with caching for performance
 */
const dayCompletionCache = new Map<string, CompletionItem[]>();

/**
 * Gets cached or generates new day completions for a month/year combination
 */
export const getCachedDayCompletions = (partialDate: PartialDatePattern): CompletionItem[] => {
	if (!partialDate.isValid) return [];
	
	const cacheKey = `${partialDate.year}-${partialDate.month}`;
	if (dayCompletionCache.has(cacheKey)) {
		return dayCompletionCache.get(cacheKey)!;
	}
	
	const completions = generateDayCompletions(partialDate);
	dayCompletionCache.set(cacheKey, completions);
	
	// Prevent cache from growing too large
	if (dayCompletionCache.size > 50) {
		const firstKey = dayCompletionCache.keys().next().value;
		dayCompletionCache.delete(firstKey);
	}
	
	return completions;
};

/**
 * Validates and formats a complete date string
 */
export const validateAndFormatDate = (dateStr: string): { isValid: boolean; formatted?: string; error?: string } => {
	const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (!match) {
		return { isValid: false, error: "Invalid date format. Use YYYY-MM-DD" };
	}
	
	const year = parseInt(match[1], 10);
	const month = parseInt(match[2], 10);
	const day = parseInt(match[3], 10);
	
	// Validate ranges
	if (year < 1000 || year > 9999) {
		return { isValid: false, error: "Year must be between 1000 and 9999" };
	}
	if (month < 1 || month > 12) {
		return { isValid: false, error: "Month must be between 1 and 12" };
	}
	
	const daysInMonth = getDaysInMonth(year, month);
	if (day < 1 || day > daysInMonth) {
		return { isValid: false, error: `Day must be between 1 and ${daysInMonth} for ${match[1]}-${match[2]}` };
	}
	
	// Format with zero padding
	const formatted = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
	return { isValid: true, formatted };
};

/**
 * Export utility functions for testing and external use
 */
export const dateUtils = {
	isLeapYear,
	getDaysInMonth,
	parsePartialDatePattern,
	getDatePatternSubtype,
	generateDayCompletions,
	DATE_PATTERN_REGEXES,
};
