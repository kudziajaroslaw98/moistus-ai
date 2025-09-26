/**
 * Completions - Unified autocompletion for all patterns
 * Provides smart suggestions for all pattern types
 */

import {
	CompletionContext,
	CompletionResult,
	CompletionSource,
} from '@codemirror/autocomplete';
import { commandRegistry } from '../../core/commands/command-registry';

/**
 * Icon map for different completion types
 */
const COMPLETION_ICONS = {
	tag: '#',
	assignee: '@',
	date: '^',
	priority: '!',
	status: ':',
	reference: '[[',
	nodeType: '$',
	command: '/',
	color: '🎨',
};

/**
 * Common tag suggestions
 */
const TAG_SUGGESTIONS = [
	'bug',
	'feature',
	'urgent',
	'important',
	'todo',
	'done',
	'meeting',
	'review',
	'question',
	'idea',
	'help',
	'wip',
	'blocked',
	'ready',
	'testing',
	'documentation',
];

/**
 * Common assignee suggestions
 */
const ASSIGNEE_SUGGESTIONS = [
	'me',
	'team',
	'john',
	'sarah',
	'admin',
	'dev',
	'design',
	'product',
	'marketing',
	'support',
];

/**
 * Date suggestions
 */
const DATE_SUGGESTIONS = [
	'today',
	'tomorrow',
	'yesterday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
	'next-week',
	'next-month',
	'eod',
	'eow',
	'eom',
];

/**
 * Priority suggestions
 */
const PRIORITY_SUGGESTIONS = [
	{ label: '!', info: 'Low priority' },
	{ label: '!!', info: 'Medium priority' },
	{ label: '!!!', info: 'High priority' },
	{ label: '!high', info: 'High priority' },
	{ label: '!medium', info: 'Medium priority' },
	{ label: '!low', info: 'Low priority' },
	{ label: '!critical', info: 'Critical priority' },
	{ label: '!urgent', info: 'Urgent priority' },
];

/**
 * Status suggestions
 */
const STATUS_SUGGESTIONS = [
	'done',
	'in-progress',
	'blocked',
	'pending',
	'review',
	'approved',
	'rejected',
	'draft',
	'published',
	'archived',
];

/**
 * Color suggestions
 */
const COLOR_SUGGESTIONS = [
	'red',
	'blue',
	'green',
	'yellow',
	'orange',
	'purple',
	'pink',
	'black',
	'white',
	'gray',
	'#ff0000',
	'#00ff00',
	'#0000ff',
];

/**
 * Main completion source
 */
export function createCompletions(): CompletionSource {
	return (context: CompletionContext): CompletionResult | null => {
		const { pos, state } = context;
		const line = state.doc.lineAt(pos);
		const textBefore = line.text.slice(0, pos - line.from);
		const word = context.matchBefore(/\S*/);

		if (!word) return null;

		// Check for different pattern types
		const lastChar = word.text.slice(-1);
		const prefix = word.text;

		// Tag completions (#)
		if (prefix.startsWith('#')) {
			const search = prefix.slice(1).toLowerCase();
			const options = TAG_SUGGESTIONS.filter((tag) =>
				tag.toLowerCase().includes(search)
			).map((tag) => ({
				label: `#${tag}`,
				type: 'keyword',
				apply: `#${tag}`,
				info: `Tag: ${tag}`,
			}));

			if (options.length === 0) return null;

			return {
				from: word.from,
				options,
				validFor: /^#\w*/,
			};
		}

		// Assignee completions (@)
		if (prefix.startsWith('@')) {
			const search = prefix.slice(1).toLowerCase();
			const options = ASSIGNEE_SUGGESTIONS.filter((person) =>
				person.toLowerCase().includes(search)
			).map((person) => ({
				label: `@${person}`,
				type: 'variable',
				apply: `@${person}`,
				info: `Assign to: ${person}`,
			}));

			if (options.length === 0) return null;

			return {
				from: word.from,
				options,
				validFor: /^@\w*/,
			};
		}

		// Date completions (^)
		if (prefix.startsWith('^')) {
			const search = prefix.slice(1).toLowerCase();
			const options = DATE_SUGGESTIONS.filter((date) =>
				date.toLowerCase().includes(search)
			).map((date) => ({
				label: `^${date}`,
				type: 'constant',
				apply: `^${date}`,
				info: `Date: ${date}`,
			}));

			// Add ISO date format suggestion
			if (search.match(/\d/)) {
				const today = new Date();
				options.unshift({
					label: `^${today.toISOString().split('T')[0]}`,
					type: 'constant',
					apply: `^${today.toISOString().split('T')[0]}`,
					info: 'Today in ISO format',
				});
			}

			if (options.length === 0) return null;

			return {
				from: word.from,
				options,
				validFor: /^\^\S*/,
			};
		}

		// Priority completions (!)
		if (prefix === '!') {
			const options = PRIORITY_SUGGESTIONS.map((p) => ({
				label: p.label,
				type: 'keyword',
				apply: p.label,
				info: p.info,
			}));

			return {
				from: word.from,
				options,
				validFor: /^!\w*/,
			};
		}

		// Status completions (:)
		if (prefix.startsWith(':')) {
			const search = prefix.slice(1).toLowerCase();
			const options = STATUS_SUGGESTIONS.filter((status) =>
				status.toLowerCase().includes(search)
			).map((status) => ({
				label: `:${status}`,
				type: 'property',
				apply: `:${status}`,
				info: `Status: ${status}`,
			}));

			if (options.length === 0) return null;

			return {
				from: word.from,
				options,
				validFor: /^:\w*/,
			};
		}

		// Color completions
		if (prefix.startsWith('color:')) {
			const search = prefix.slice(6).toLowerCase();
			const options = COLOR_SUGGESTIONS.filter((color) =>
				color.toLowerCase().includes(search)
			).map((color) => ({
				label: `color:${color}`,
				type: 'property',
				apply: `color:${color}`,
				info: `Color: ${color}`,
			}));

			return {
				from: word.from,
				options,
				validFor: /^color:\S*/,
			};
		}

		// Node type completions ($)
		if (prefix.startsWith('$')) {
			const search = prefix.slice(1).toLowerCase();
			const nodeTypes = commandRegistry.getCommandsByTriggerType('node-type');
			const options = nodeTypes
				.filter((cmd) => cmd.trigger.toLowerCase().includes(search))
				.map((cmd) => ({
					label: cmd.trigger,
					type: 'class',
					apply: cmd.trigger + ' ',
					info: cmd.description,
				}));

			if (options.length === 0) return null;

			return {
				from: word.from,
				options,
				validFor: /^\$\w*/,
			};
		}

		// Slash command completions (/)
		if (prefix.startsWith('/')) {
			const search = prefix.slice(1).toLowerCase();
			const commands = commandRegistry.getCommandsByTriggerType('slash');
			const options = commands
				.filter((cmd) => cmd.trigger.toLowerCase().includes(search))
				.map((cmd) => ({
					label: cmd.trigger,
					type: 'function',
					apply: cmd.trigger + ' ',
					info: cmd.description,
				}));

			if (options.length === 0) return null;

			return {
				from: word.from,
				options,
				validFor: /^\/\w*/,
			};
		}

		// Reference completions ([[)
		if (prefix.startsWith('[[')) {
			// For now, just suggest the format
			const options = [
				{
					label: '[[node-id]]',
					type: 'text',
					apply: '[[node-id]]',
					info: 'Reference another node',
				},
				{
					label: '[[http://example.com]]',
					type: 'text',
					apply: '[[http://]]',
					info: 'Reference a URL',
				},
			];

			return {
				from: word.from,
				options,
				validFor: /^\[\[.*\]\]?/,
			};
		}

		// Pattern trigger suggestions
		if (word.text === '' || word.text.match(/^\s*$/)) {
			const triggers = [
				{ label: '#', apply: '#', info: 'Add a tag' },
				{ label: '@', apply: '@', info: 'Mention someone' },
				{ label: '^', apply: '^', info: 'Add a date' },
				{ label: '!', apply: '!', info: 'Set priority' },
				{ label: ':', apply: ':', info: 'Set status' },
				{ label: '$', apply: '$', info: 'Change node type' },
				{ label: '/', apply: '/', info: 'Insert command' },
			];

			return {
				from: pos,
				options: triggers,
			};
		}

		return null;
	};
}
