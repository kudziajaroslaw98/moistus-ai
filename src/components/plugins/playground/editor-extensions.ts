import { UI_CALLS } from '@/app/dashboard/plugins/build/guide-reference';
import type {
	Completion,
	CompletionContext,
	CompletionResult,
	CompletionSource,
} from '@codemirror/autocomplete';
import { jsonParseLinter } from '@codemirror/lang-json';
import {
	HighlightStyle,
	syntaxHighlighting,
	syntaxTree,
} from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/**
 * Editor look and behaviour for the playground's two files. Colors follow the code
 * block's syntax theme (`code-syntax-theme.ts`) on the dashboard's dark surfaces.
 */

const MONO =
	"ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Mono', monospace";

export const pluginEditorTheme = EditorView.theme(
	{
		'&': {
			height: '100%',
			backgroundColor: 'transparent',
			color: '#e4e4e7',
			fontSize: '13px',
		},
		'&.cm-focused': { outline: 'none' },
		'.cm-scroller': { fontFamily: MONO, lineHeight: '22px', overflow: 'auto' },
		'.cm-content': { padding: '10px 0', caretColor: '#e4e4e7' },
		'.cm-line': { padding: '0 16px' },
		'.cm-cursor, .cm-dropCursor': { borderLeftColor: '#e4e4e7' },
		'.cm-gutters': {
			backgroundColor: '#0e0f12',
			color: '#4f4f52',
			border: 'none',
			borderRight: '1px solid #1d1f24',
		},
		'.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px' },
		'.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.04)' },
		'.cm-activeLineGutter': {
			backgroundColor: 'rgba(255,255,255,0.04)',
			color: '#c9c9ca',
		},
		'&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
			{
				backgroundColor: 'rgba(96,165,250,0.28)',
			},
		'.cm-matchingBracket': {
			backgroundColor: 'rgba(255,255,255,0.12)',
			outline: 'none',
		},
		'.cm-tooltip': {
			backgroundColor: '#0e0f12',
			border: '1px solid #2a2c33',
			borderRadius: '10px',
			color: '#e4e4e7',
			boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
		},
		'.cm-tooltip-autocomplete > ul': { fontFamily: MONO, fontSize: '12px' },
		'.cm-tooltip-autocomplete > ul > li[aria-selected]': {
			backgroundColor: 'rgba(20,184,166,0.15)',
			color: '#fafafa',
		},
		'.cm-completionDetail': { color: '#71717a', marginLeft: '8px' },
		'.cm-completionInfo': {
			padding: '8px 10px',
			fontSize: '12px',
			maxWidth: '280px',
		},
		'.cm-diagnostic-error': { borderLeft: '3px solid #ef4444' },
		'.cm-lintRange-error': {
			backgroundImage: 'none',
			textDecoration: 'underline wavy #ef4444',
			textUnderlineOffset: '3px',
		},
	},
	{ dark: true }
);

const AMBER = 'rgba(251, 191, 36, 0.87)';
const EMERALD = 'rgba(52, 211, 153, 0.87)';
const VIOLET = 'rgba(167, 139, 250, 0.87)';
const BLUE = 'rgba(147, 197, 253, 0.87)';
const ORANGE = 'rgba(251, 146, 60, 0.87)';

export const pluginHighlight = syntaxHighlighting(
	HighlightStyle.define([
		{ tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: VIOLET },
		{ tag: [tags.string, tags.special(tags.string)], color: EMERALD },
		{ tag: [tags.number, tags.bool, tags.null, tags.atom], color: AMBER },
		{ tag: [tags.propertyName], color: BLUE },
		{
			tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
			color: ORANGE,
		},
		{ tag: [tags.operator], color: VIOLET },
		{
			tag: [tags.comment, tags.lineComment, tags.blockComment],
			color: '#71717a',
		},
		{ tag: [tags.punctuation, tags.bracket, tags.separator], color: '#a1a1aa' },
	])
);

/**
 * Keeps every line matching `pattern` as it is: edits that touch it are dropped, the
 * rest of the change still applies. The manifest's `"id"` line uses it (Shiko sets the id).
 */
export function lockedLines(pattern: RegExp): Extension {
	return EditorState.changeFilter.of((transaction) => {
		const doc = transaction.startState.doc;
		const locked: number[] = [];
		for (let number = 1; number <= doc.lines; number++) {
			const line = doc.line(number);
			if (pattern.test(line.text)) locked.push(line.from, line.to);
		}
		return locked.length > 0 ? locked : true;
	});
}

const SYNTAX_ERRORS_SHOWN = 5;

/** Red markers on JavaScript the parser couldn't read. */
export const javascriptSyntaxLinter = linter((view) => {
	const diagnostics: Diagnostic[] = [];
	syntaxTree(view.state).iterate({
		enter(node) {
			if (diagnostics.length >= SYNTAX_ERRORS_SHOWN) return false;
			if (node.type.isError) {
				diagnostics.push({
					from: node.from,
					to: Math.max(node.to, Math.min(node.from + 1, view.state.doc.length)),
					severity: 'error',
					message: 'Syntax error',
				});
			}
		},
	});
	return diagnostics;
});

/** Red marker where `JSON.parse` stops. */
export const jsonSyntaxLinter = linter(jsonParseLinter());

// ---------------------------------------------------------------------------
// Autocomplete

const UI_OPTIONS: Completion[] = UI_CALLS.map((call) => ({
	label: call.name.split('(')[0],
	type: 'function',
	detail: call.name.slice(call.name.indexOf('(')),
	info: call.description,
	apply: `${call.name.split('(')[0]}(`,
}));

const CTX_OPTIONS: Completion[] = [
	{
		label: 'ctx.canEdit',
		type: 'property',
		info: 'false for people who can only view the map',
	},
	{
		label: 'ctx.today',
		type: 'property',
		info: 'The viewer’s date, YYYY-MM-DD',
	},
	{
		label: 'ctx.branch',
		type: 'property',
		info: 'The nodes under yours (needs the branch:read power)',
	},
	{
		label: 'ctx.refs',
		type: 'property',
		info: 'The nodes your data links to, by id (needs the nodes:refs power). A deleted node has no entry',
	},
	{
		label: 'ctx.request',
		type: 'function',
		detail: '(url)',
		info: 'Asks a site you declared. Only inside refresh (needs a network power)',
		apply: 'ctx.request(',
	},
];

const ENTRY_OPTIONS: Completion[] = [
	{
		label: 'definePlugin',
		type: 'function',
		info: 'Describe your node kinds. Call it once.',
	},
	{
		label: 'kinds',
		type: 'property',
		info: 'One entry per node kind in manifest.json',
	},
	{
		label: 'render',
		type: 'method',
		info: 'render(data, ctx) returns the node’s view',
	},
	{
		label: 'summary',
		type: 'method',
		info: 'Plain text for search, AI and exports',
	},
	{
		label: 'actions',
		type: 'property',
		info: 'Functions buttons run: (data, payload, ctx) → new data',
	},
	{ label: 'refresh', type: 'method', info: 'The one place ctx.request works' },
];

/** `ui.…` and `ctx.…` members, and the plugin entry points while typing a word. */
export function pluginCompletions(): CompletionSource {
	return (context: CompletionContext): CompletionResult | null => {
		const member = context.matchBefore(/\b(ui|ctx)\.\w*/);
		if (member) {
			return {
				from: member.from,
				options: member.text.startsWith('ui.') ? UI_OPTIONS : CTX_OPTIONS,
			};
		}
		const word = context.matchBefore(/\w{2,}/);
		if (word && (context.explicit || word.to - word.from >= 3)) {
			return { from: word.from, options: ENTRY_OPTIONS };
		}
		return null;
	};
}
