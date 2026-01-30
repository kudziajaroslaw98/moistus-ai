/**
 * Keyboard shortcuts configuration
 * Single source of truth for all keyboard shortcuts displayed in the help FAB
 */

export type ShortcutCategory = 'navigation' | 'general' | 'nodes' | 'view';

export interface KeyboardShortcut {
	keys: string[];
	label: string;
	category: ShortcutCategory;
	requiresSelection?: boolean;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
	// Navigation
	{
		keys: ['↑', '↓', '←', '→'],
		label: 'Move between nodes',
		category: 'navigation',
	},

	// General
	{ keys: ['⌘', 'C'], label: 'Copy selected nodes', category: 'general' },
	{ keys: ['⌘', 'V'], label: 'Paste nodes', category: 'general' },

	// Nodes
	{
		keys: ['⌘', '↑ / ↓ / ← / →'],
		label: 'Add node in direction',
		category: 'nodes',
		requiresSelection: true,
	},
	{ keys: ['⌘', 'G'], label: 'Group selected', category: 'nodes' },
	{ keys: ['⌘', '⇧', 'G'], label: 'Ungroup', category: 'nodes' },
	{
		keys: ['⌘', '-'],
		label: 'Toggle collapse',
		category: 'nodes',
		requiresSelection: true,
	},

	// View
	{ keys: ['⌘', 'L'], label: 'Auto-layout', category: 'view' },
	{ keys: ['/'], label: 'Quick create node', category: 'view' },
];

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
	navigation: 'Navigation',
	general: 'General',
	nodes: 'Nodes',
	view: 'View',
};

/**
 * Order for displaying categories in the help card
 */
export const CATEGORY_ORDER: ShortcutCategory[] = [
	'navigation',
	'general',
	'nodes',
	'view',
];
