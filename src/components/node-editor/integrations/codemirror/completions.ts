/**
 * Completions - Unified autocompletion for all patterns
 * Provides smart suggestions for all pattern types
 *
 * Features:
 * - Complete autocomplete for all prefix:value patterns
 * - Partial prefix matching (typing "wei" suggests "weight:")
 * - Color swatches in dropdown
 */

import {
	CompletionContext,
	CompletionResult,
	CompletionSource,
	startCompletion,
} from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { commandRegistry } from '../../core/commands/command-registry';

// ============================================================================
// COLLABORATOR MENTION TYPE
// ============================================================================

export interface CollaboratorMention {
	slug: string; // inserted text slug, e.g. "sarah-chen"
	displayName: string; // shown in dropdown, e.g. "Sarah Chen"
	avatarUrl: string; // empty string for built-ins
	role: 'editor' | 'viewer' | 'built-in';
}

// ============================================================================
// SUGGESTION DATA
// ============================================================================

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
 * Built-in team role mentions (shown when no real collaborators match)
 */
const BUILT_IN_MENTIONS: CollaboratorMention[] = [
	'dev',
	'qa',
	'ops',
	'design',
	'ux',
	'product',
	'management',
	'marketing',
	'sales',
	'support',
	'security',
	'data',
	'legal',
].map((slug) => ({
	slug,
	displayName: slug[0].toUpperCase() + slug.slice(1),
	avatarUrl: '',
	role: 'built-in' as const,
}));

/**
 * Date suggestions with shorthands
 */
const DATE_SUGGESTIONS = [
	{ label: 'today', info: 'Today' },
	{ label: 'tomorrow', info: 'Tomorrow' },
	{ label: 'yesterday', info: 'Yesterday' },
	{ label: 'monday', info: 'Next Monday' },
	{ label: 'tuesday', info: 'Next Tuesday' },
	{ label: 'wednesday', info: 'Next Wednesday' },
	{ label: 'thursday', info: 'Next Thursday' },
	{ label: 'friday', info: 'Next Friday' },
	{ label: 'saturday', info: 'Next Saturday' },
	{ label: 'sunday', info: 'Next Sunday' },
	{ label: 'next-week', info: 'One week from now' },
	{ label: 'next-month', info: 'One month from now' },
	{ label: 'eod', info: 'End of day' },
	{ label: 'eow', info: 'End of week' },
	{ label: 'eom', info: 'End of month' },
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
 * Color suggestions with hex values for swatches
 */
const COLOR_SUGGESTIONS = [
	{ label: 'red', hex: '#ef4444' },
	{ label: 'orange', hex: '#f97316' },
	{ label: 'amber', hex: '#f59e0b' },
	{ label: 'yellow', hex: '#eab308' },
	{ label: 'lime', hex: '#84cc16' },
	{ label: 'green', hex: '#22c55e' },
	{ label: 'emerald', hex: '#10b981' },
	{ label: 'teal', hex: '#14b8a6' },
	{ label: 'cyan', hex: '#06b6d4' },
	{ label: 'sky', hex: '#0ea5e9' },
	{ label: 'blue', hex: '#3b82f6' },
	{ label: 'indigo', hex: '#6366f1' },
	{ label: 'violet', hex: '#8b5cf6' },
	{ label: 'purple', hex: '#a855f7' },
	{ label: 'fuchsia', hex: '#d946ef' },
	{ label: 'pink', hex: '#ec4899' },
	{ label: 'rose', hex: '#f43f5e' },
	{ label: 'slate', hex: '#64748b' },
	{ label: 'gray', hex: '#6b7280' },
	{ label: 'zinc', hex: '#71717a' },
	{ label: 'neutral', hex: '#737373' },
	{ label: 'stone', hex: '#78716c' },
	{ label: 'black', hex: '#000000' },
	{ label: 'white', hex: '#ffffff' },
];

/**
 * Font size suggestions
 */
const SIZE_SUGGESTIONS = [
	{ label: '12px', info: 'Extra small' },
	{ label: '14px', info: 'Small' },
	{ label: '16px', info: 'Base size' },
	{ label: '18px', info: 'Medium' },
	{ label: '20px', info: 'Large' },
	{ label: '24px', info: 'Extra large' },
	{ label: '28px', info: 'XXL' },
	{ label: '32px', info: 'Heading 3' },
	{ label: '36px', info: 'Heading 2' },
	{ label: '48px', info: 'Heading 1' },
	{ label: '1rem', info: '16px equivalent' },
	{ label: '1.25rem', info: '20px equivalent' },
	{ label: '1.5rem', info: '24px equivalent' },
	{ label: '2rem', info: '32px equivalent' },
	{ label: '2.5rem', info: '40px equivalent' },
	{ label: '3rem', info: '48px equivalent' },
];

/**
 * Font weight suggestions
 */
const WEIGHT_SUGGESTIONS = [
	{ label: 'normal', info: 'Normal weight (400)' },
	{ label: 'bold', info: 'Bold weight (700)' },
	{ label: 'bolder', info: 'Bolder than parent' },
	{ label: 'lighter', info: 'Lighter than parent' },
	{ label: '100', info: 'Thin' },
	{ label: '200', info: 'Extra Light' },
	{ label: '300', info: 'Light' },
	{ label: '400', info: 'Normal' },
	{ label: '500', info: 'Medium' },
	{ label: '600', info: 'Semi Bold' },
	{ label: '700', info: 'Bold' },
	{ label: '800', info: 'Extra Bold' },
	{ label: '900', info: 'Black' },
];

/**
 * Font style suggestions
 */
const STYLE_SUGGESTIONS = [
	{ label: 'normal', info: 'Normal style' },
	{ label: 'italic', info: 'Italic style' },
	{ label: 'oblique', info: 'Oblique style' },
];

/**
 * Text align suggestions
 */
const ALIGN_SUGGESTIONS = [
	{ label: 'left', info: 'Align text left' },
	{ label: 'center', info: 'Center text' },
	{ label: 'right', info: 'Align text right' },
];

/**
 * Question type suggestions
 */
const QUESTION_TYPE_SUGGESTIONS = [
	{ label: 'binary', info: 'Yes/No question' },
	{ label: 'multiple', info: 'Multiple choice question' },
];

/**
 * Annotation type suggestions
 */
const ANNOTATION_TYPE_SUGGESTIONS = [
	{ label: 'warning', info: 'Warning annotation', emoji: '⚠️' },
	{ label: 'success', info: 'Success annotation', emoji: '✅' },
	{ label: 'info', info: 'Info annotation', emoji: 'ℹ️' },
	{ label: 'error', info: 'Error annotation', emoji: '❌' },
	{ label: 'note', info: 'Note/idea annotation', emoji: '💡' },
];

/**
 * Programming language suggestions
 */
const LANGUAGE_SUGGESTIONS = [
	'javascript',
	'typescript',
	'python',
	'java',
	'csharp',
	'cpp',
	'c',
	'go',
	'rust',
	'ruby',
	'php',
	'swift',
	'kotlin',
	'scala',
	'html',
	'css',
	'scss',
	'less',
	'sql',
	'json',
	'yaml',
	'xml',
	'markdown',
	'bash',
	'shell',
	'powershell',
	'dockerfile',
	'graphql',
	'plaintext',
];

/**
 * Pattern prefix suggestions for partial matching
 */
const PATTERN_PREFIXES = [
	{ prefix: 'size:', description: 'Set font size', trigger: 'size:' },
	{ prefix: 'weight:', description: 'Set font weight', trigger: 'weight:' },
	{ prefix: 'style:', description: 'Set font style', trigger: 'style:' },
	{ prefix: 'align:', description: 'Set text alignment', trigger: 'align:' },
	{ prefix: 'color:', description: 'Set text color', trigger: 'color:' },
	{ prefix: 'bg:', description: 'Set background color', trigger: 'bg:' },
	{
		prefix: 'border:',
		description: 'Set border color',
		trigger: 'border:',
	},
	{ prefix: 'url:', description: 'Set URL', trigger: 'url:' },
	{ prefix: 'title:', description: 'Set title', trigger: 'title:"' },
	{ prefix: 'lang:', description: 'Set language', trigger: 'lang:' },
	{ prefix: 'file:', description: 'Set filename', trigger: 'file:' },
	{
		prefix: 'question:',
		description: 'Set question type',
		trigger: 'question:',
	},
	{ prefix: 'options:', description: 'Set options', trigger: 'options:[' },
	{ prefix: 'type:', description: 'Set annotation type', trigger: 'type:' },
	{
		prefix: 'confidence:',
		description: 'Set confidence',
		trigger: 'confidence:',
	},
];

// ============================================================================
// MAIN COMPLETION SOURCE
// ============================================================================

/**
 * Main completion source
 * @returns source - CompletionSource for CodeMirror autocompletion
 * @returns mentionMap - Map of label → CollaboratorMention for avatar rendering
 */
export function createCompletions(
	collaborators: CollaboratorMention[] = []
): { source: CompletionSource; mentionMap: Map<string, CollaboratorMention> } {
	const allMentions = [...collaborators, ...BUILT_IN_MENTIONS];

	// Build label → mention map for the avatar renderer in setup.ts
	const mentionMap = new Map<string, CollaboratorMention>();
	for (const m of allMentions) {
		mentionMap.set(`@${m.slug}`, m);
	}

	const source: CompletionSource = (context: CompletionContext): CompletionResult | null => {
		const { pos } = context;
		const word = context.matchBefore(/\S*/);

		if (!word) return null;

		const prefix = word.text;

		// ================================================================
		// TAG COMPLETIONS (#)
		// ================================================================
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

		// ================================================================
		// ASSIGNEE COMPLETIONS (@)
		// ================================================================
		if (prefix.startsWith('@')) {
			const search = prefix.slice(1).toLowerCase();
			const options = allMentions
				.filter(
					(m) =>
						m.slug.includes(search) ||
						m.displayName.toLowerCase().includes(search)
				)
				.map((m) => ({
					label: `@${m.slug}`,
					type: 'variable',
					apply: `@${m.slug}`,
					info: `${m.role === 'built-in' ? 'Team role' : m.role}: ${m.displayName}`,
					boost: m.role === 'built-in' ? 0 : 1,
				}));

			if (options.length === 0) return null;

			return {
				from: word.from,
				options,
				// Fix: hyphens must be included so incremental filtering works for "sarah-chen"
				validFor: /^@[\w-]*/,
			};
		}

		// ================================================================
		// DATE COMPLETIONS (^)
		// ================================================================
		if (prefix.startsWith('^')) {
			const search = prefix.slice(1).toLowerCase();
			const options = DATE_SUGGESTIONS.filter((d) =>
				d.label.toLowerCase().includes(search)
			).map((d) => ({
				label: `^${d.label}`,
				type: 'constant',
				apply: `^${d.label}`,
				info: d.info,
			}));

			// Add ISO date format suggestion if typing numbers
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

		// ================================================================
		// PRIORITY COMPLETIONS (!)
		// ================================================================
		if (prefix === '!' || prefix.startsWith('!')) {
			const search = prefix.slice(1).toLowerCase();
			const options = PRIORITY_SUGGESTIONS.filter(
				(p) =>
					p.label.toLowerCase().includes(search) ||
					p.label === prefix
			).map((p) => ({
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

		// ================================================================
		// STATUS COMPLETIONS (:) - but not for prefix:value patterns
		// ================================================================
		if (
			prefix.startsWith(':') &&
			!prefix.includes('color:') &&
			!prefix.includes('size:') &&
			!prefix.includes('weight:')
		) {
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

		// ================================================================
		// COLOR COMPLETIONS (color:) - with swatches
		// ================================================================
		if (prefix.startsWith('color:')) {
			const search = prefix.slice(6).toLowerCase();
			// Show all options when search is empty (just typed "color:")
			const options = COLOR_SUGGESTIONS.filter(
				(c) => !search || c.label.toLowerCase().includes(search)
			).map((c) => ({
				label: `color:${c.label}`,
				// No type - swatch replaces the default icon
				apply: `color:${c.label}`,
				// Store hex in detail - custom render in setup.ts will create swatch
				detail: c.hex,
			}));

			return {
				from: word.from,
				options,
				validFor: /^color:\S*/,
			};
		}

		// ================================================================
		// BACKGROUND COLOR COMPLETIONS (bg:) - with swatches
		// ================================================================
		if (prefix.startsWith('bg:')) {
			const search = prefix.slice(3).toLowerCase();
			const options = COLOR_SUGGESTIONS.filter(
				(c) => !search || c.label.toLowerCase().includes(search)
			).map((c) => ({
				label: `bg:${c.label}`,
				// No type - swatch replaces the default icon
				apply: `bg:${c.label}`,
				// Store hex in detail - custom render in setup.ts will create swatch
				detail: c.hex,
			}));

			return {
				from: word.from,
				options,
				validFor: /^bg:\S*/,
			};
		}

		// ================================================================
		// BORDER COLOR COMPLETIONS (border:) - with swatches
		// ================================================================
		if (prefix.startsWith('border:')) {
			const search = prefix.slice(7).toLowerCase();
			const options = COLOR_SUGGESTIONS.filter(
				(c) => !search || c.label.toLowerCase().includes(search)
			).map((c) => ({
				label: `border:${c.label}`,
				// No type - swatch replaces the default icon
				apply: `border:${c.label}`,
				// Store hex in detail - custom render in setup.ts will create swatch
				detail: c.hex,
			}));

			return {
				from: word.from,
				options,
				validFor: /^border:\S*/,
			};
		}

		// ================================================================
		// SIZE COMPLETIONS (size:)
		// ================================================================
		if (prefix.startsWith('size:')) {
			const search = prefix.slice(5).toLowerCase();
			const options = SIZE_SUGGESTIONS.filter(
				(s) => !search || s.label.toLowerCase().includes(search)
			).map((s) => ({
				label: `size:${s.label}`,
				type: 'property',
				apply: `size:${s.label}`,
				info: s.info,
			}));

			return {
				from: word.from,
				options,
				validFor: /^size:\S*/,
			};
		}

		// ================================================================
		// WEIGHT COMPLETIONS (weight:)
		// ================================================================
		if (prefix.startsWith('weight:')) {
			const search = prefix.slice(7).toLowerCase();
			const options = WEIGHT_SUGGESTIONS.filter(
				(w) => !search || w.label.toLowerCase().includes(search)
			).map((w) => ({
				label: `weight:${w.label}`,
				type: 'property',
				apply: `weight:${w.label}`,
				info: w.info,
			}));

			return {
				from: word.from,
				options,
				validFor: /^weight:\S*/,
			};
		}

		// ================================================================
		// STYLE COMPLETIONS (style:)
		// ================================================================
		if (prefix.startsWith('style:')) {
			const search = prefix.slice(6).toLowerCase();
			const options = STYLE_SUGGESTIONS.filter(
				(s) => !search || s.label.toLowerCase().includes(search)
			).map((s) => ({
				label: `style:${s.label}`,
				type: 'property',
				apply: `style:${s.label}`,
				info: s.info,
			}));

			return {
				from: word.from,
				options,
				validFor: /^style:\S*/,
			};
		}

		// ================================================================
		// ALIGN COMPLETIONS (align:)
		// ================================================================
		if (prefix.startsWith('align:')) {
			const search = prefix.slice(6).toLowerCase();
			const options = ALIGN_SUGGESTIONS.filter(
				(a) => !search || a.label.toLowerCase().includes(search)
			).map((a) => ({
				label: `align:${a.label}`,
				type: 'property',
				apply: `align:${a.label}`,
				info: a.info,
			}));

			return {
				from: word.from,
				options,
				validFor: /^align:\S*/,
			};
		}

		// ================================================================
		// QUESTION TYPE COMPLETIONS (question:)
		// ================================================================
		if (prefix.startsWith('question:')) {
			const search = prefix.slice(9).toLowerCase();
			const options = QUESTION_TYPE_SUGGESTIONS.filter(
				(q) => !search || q.label.toLowerCase().includes(search)
			).map((q) => ({
				label: `question:${q.label}`,
				type: 'keyword',
				apply: `question:${q.label}`,
				info: q.info,
			}));

			return {
				from: word.from,
				options,
				validFor: /^question:\S*/,
			};
		}

		// ================================================================
		// ANNOTATION TYPE COMPLETIONS (type:)
		// ================================================================
		if (prefix.startsWith('type:')) {
			const search = prefix.slice(5).toLowerCase();
			const options = ANNOTATION_TYPE_SUGGESTIONS.filter(
				(t) => !search || t.label.toLowerCase().includes(search)
			).map((t) => ({
				label: `type:${t.label}`,
				type: 'keyword',
				apply: `type:${t.label}`,
				info: `${t.emoji} ${t.info}`,
			}));

			return {
				from: word.from,
				options,
				validFor: /^type:\S*/,
			};
		}

		// ================================================================
		// LANGUAGE COMPLETIONS (lang:)
		// ================================================================
		if (prefix.startsWith('lang:')) {
			const search = prefix.slice(5).toLowerCase();
			const options = LANGUAGE_SUGGESTIONS.filter(
				(l) => !search || l.toLowerCase().includes(search)
			).map((lang) => ({
				label: `lang:${lang}`,
				type: 'property',
				apply: `lang:${lang}`,
				info: `Language: ${lang}`,
			}));

			return {
				from: word.from,
				options,
				validFor: /^lang:\S*/,
			};
		}

		// ================================================================
		// FILE COMPLETIONS (file:)
		// ================================================================
		if (prefix.startsWith('file:')) {
			// Just provide format hints since filenames are user-specific
			return {
				from: word.from,
				options: [
					{
						label: 'file:example.ts',
						type: 'text',
						apply: 'file:',
						info: 'TypeScript file',
					},
					{
						label: 'file:example.js',
						type: 'text',
						apply: 'file:',
						info: 'JavaScript file',
					},
					{
						label: 'file:example.py',
						type: 'text',
						apply: 'file:',
						info: 'Python file',
					},
				],
				validFor: /^file:\S*/,
			};
		}

		// ================================================================
		// URL COMPLETIONS (url:)
		// ================================================================
		if (prefix.startsWith('url:')) {
			return {
				from: word.from,
				options: [
					{
						label: 'url:https://',
						type: 'text',
						apply: 'url:https://',
						info: 'HTTPS URL',
					},
					{
						label: 'url:http://',
						type: 'text',
						apply: 'url:http://',
						info: 'HTTP URL',
					},
				],
				validFor: /^url:\S*/,
			};
		}

		// ================================================================
		// NODE TYPE COMPLETIONS ($)
		// ================================================================
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

		// ================================================================
		// SLASH COMMAND COMPLETIONS (/)
		// ================================================================
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

		// ================================================================
		// REFERENCE COMPLETIONS ([[)
		// ================================================================
		if (prefix.startsWith('[[')) {
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

		// ================================================================
		// PARTIAL PREFIX MATCHING (e.g., "wei" -> "weight:")
		// ================================================================
		if (
			prefix.length >= 2 &&
			!prefix.includes(':') &&
			!prefix.startsWith('#') &&
			!prefix.startsWith('@') &&
			!prefix.startsWith('^') &&
			!prefix.startsWith('!') &&
			!prefix.startsWith('$') &&
			!prefix.startsWith('/') &&
			!prefix.startsWith('[') &&
			!prefix.startsWith(':')
		) {
			const matchingPrefixes = PATTERN_PREFIXES.filter((p) =>
				p.prefix.toLowerCase().startsWith(prefix.toLowerCase())
			);

			if (matchingPrefixes.length > 0) {
				return {
					from: word.from,
					options: matchingPrefixes.map((p) => ({
						label: p.prefix,
						type: 'keyword',
						// Use custom apply function to insert text AND re-trigger completion
						apply: (view: EditorView, _completion, from: number, to: number) => {
							// Insert the pattern prefix (e.g., "color:")
							view.dispatch({
								changes: { from, to, insert: p.trigger },
								selection: { anchor: from + p.trigger.length },
							});
							// Immediately trigger new completion to show value suggestions
							setTimeout(() => startCompletion(view), 0);
						},
						info: p.description,
					})),
					validFor: /^\w+$/,
				};
			}
		}

		// ================================================================
		// PATTERN TRIGGER SUGGESTIONS (empty input)
		// ================================================================
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

	return { source, mentionMap };
}
