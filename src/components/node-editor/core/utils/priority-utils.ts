/**
 * Priority Utilities - Priority validation and formatting
 */

/**
 * Valid priority levels
 */
export const PRIORITY_LEVELS = [
	'low',
	'medium',
	'high',
	'critical',
	'urgent',
	'asap',
	'blocked',
	'waiting',
] as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

/**
 * Priority display mapping
 */
export const PRIORITY_DISPLAY_MAP: Record<PriorityLevel, string> = {
	low: '🟢 Low',
	medium: '🟡 Medium',
	high: '🟠 High',
	critical: '🔴 Critical',
	urgent: '⚡ Urgent',
	asap: '🚨 ASAP',
	blocked: '⛔ Blocked',
	waiting: '⏳ Waiting',
};

/**
 * Priority color mapping
 */
export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
	low: '#10b981', // green-500
	medium: '#f59e0b', // amber-500
	high: '#f97316', // orange-500
	critical: '#ef4444', // red-500
	urgent: '#dc2626', // red-600
	asap: '#991b1b', // red-800
	blocked: '#6b7280', // gray-500
	waiting: '#3b82f6', // blue-500
};

/**
 * Priority sort order (lower = higher priority)
 */
export const PRIORITY_ORDER: Record<PriorityLevel, number> = {
	asap: 1,
	critical: 2,
	urgent: 3,
	high: 4,
	medium: 5,
	low: 6,
	blocked: 7,
	waiting: 8,
};

/**
 * Validate if a string is a valid priority
 */
export function isValidPriority(priority: string): priority is PriorityLevel {
	return PRIORITY_LEVELS.includes(priority.toLowerCase() as PriorityLevel);
}

/**
 * Parse priority from string
 */
export function parsePriority(input: string): PriorityLevel | null {
	const normalized = input.toLowerCase().trim();

	if (isValidPriority(normalized)) {
		return normalized;
	}

	// Check for common aliases
	const aliases: Record<string, PriorityLevel> = {
		lo: 'low',
		med: 'medium',
		mid: 'medium',
		hi: 'high',
		crit: 'critical',
		urg: 'urgent',
		block: 'blocked',
		wait: 'waiting',
		p0: 'critical',
		p1: 'high',
		p2: 'medium',
		p3: 'low',
	};

	if (aliases[normalized]) {
		return aliases[normalized];
	}

	return null;
}

/**
 * Format priority for display
 */
export function formatPriorityForDisplay(priority: string): string {
	const parsed = parsePriority(priority);
	if (!parsed) return priority;

	return PRIORITY_DISPLAY_MAP[parsed] || priority;
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: string): string {
	const parsed = parsePriority(priority);
	if (!parsed) return '#6b7280'; // gray-500 as default

	return PRIORITY_COLORS[parsed];
}

/**
 * Compare priorities for sorting
 */
export function comparePriorities(a: string, b: string): number {
	const priorityA = parsePriority(a);
	const priorityB = parsePriority(b);

	if (!priorityA && !priorityB) return 0;
	if (!priorityA) return 1;
	if (!priorityB) return -1;

	const orderA = PRIORITY_ORDER[priorityA];
	const orderB = PRIORITY_ORDER[priorityB];

	return orderA - orderB;
}

/**
 * Get priority suggestions
 */
export function getPrioritySuggestions(query: string = ''): PriorityLevel[] {
	if (!query) {
		return ['high', 'medium', 'low'];
	}

	const normalized = query.toLowerCase();
	return PRIORITY_LEVELS.filter(
		(level) =>
			level.includes(normalized) ||
			PRIORITY_DISPLAY_MAP[level].toLowerCase().includes(normalized)
	);
}

/**
 * Get priority icon
 */
export function getPriorityIcon(priority: string): string {
	const parsed = parsePriority(priority);
	if (!parsed) return '○';

	const icons: Record<PriorityLevel, string> = {
		low: '🟢',
		medium: '🟡',
		high: '🟠',
		critical: '🔴',
		urgent: '⚡',
		asap: '🚨',
		blocked: '⛔',
		waiting: '⏳',
	};

	return icons[parsed];
}

/**
 * Get next priority level (for cycling)
 */
export function getNextPriority(current: string): PriorityLevel {
	const parsed = parsePriority(current);
	if (!parsed) return 'low';

	const index = PRIORITY_LEVELS.indexOf(parsed);
	const nextIndex = (index + 1) % PRIORITY_LEVELS.length;

	return PRIORITY_LEVELS[nextIndex];
}

/**
 * Get previous priority level (for cycling)
 */
export function getPreviousPriority(current: string): PriorityLevel {
	const parsed = parsePriority(current);
	if (!parsed) return 'high';

	const index = PRIORITY_LEVELS.indexOf(parsed);
	const prevIndex =
		(index - 1 + PRIORITY_LEVELS.length) % PRIORITY_LEVELS.length;

	return PRIORITY_LEVELS[prevIndex];
}
