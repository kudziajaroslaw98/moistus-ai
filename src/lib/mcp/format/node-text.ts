import { parseInput } from '@/components/node-editor/core/parsers/pattern-extractor';
import type { NodeData } from '@/types/node-data';

/**
 * One node in Shiko's outline format, the text agents read and write:
 * - `head`: the node line, i.e. an optional `$type` plus quick-input text and tokens
 * - `body`: literal content lines, printed as `| ...` and never parsed for tokens
 * - `tasks`: checklist rows of a `$task` node, printed as `[ ]` / `[x]`
 */
export interface NodeOutlineText {
	head: string;
	body: string[];
	tasks: { text: string; done: boolean }[];
}

/**
 * Node-type triggers, copied from the node registry (which imports React and
 * can't load on the server). `$group` and `$plugin` are read-only labels.
 */
export const NODE_TYPE_TRIGGERS: Record<string, string> = {
	defaultNode: '$note',
	textNode: '$text',
	taskNode: '$task',
	imageNode: '$image',
	resourceNode: '$link',
	questionNode: '$question',
	codeNode: '$code',
	annotationNode: '$annotation',
	referenceNode: '$reference',
	groupNode: '$group',
	extensionNode: '$plugin',
};

const WORD_TOKEN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const PRIORITY_WORDS = new Set([
	'critical',
	'urgent',
	'asap',
	'blocked',
	'waiting',
	'1',
	'2',
	'3',
]);
const PRIORITY_SHORTHAND: Record<string, string> = { low: '!', medium: '!!', high: '!!!' };
const QUESTION_OPTION = /^[a-zA-Z0-9\s]+$/;

/** Quoted token values can't contain `"` (the parser has no escapes). */
const quoted = (value: string) => `"${value.replace(/"/g, "'")}"`;

function universalTokens(metadata: NonNullable<NodeData['metadata']>): string[] {
	const tokens: string[] = [];
	for (const tag of metadata.tags ?? []) {
		if (WORD_TOKEN.test(tag)) tokens.push(`#${tag}`);
	}
	const assignees = Array.isArray(metadata.assignee)
		? metadata.assignee
		: metadata.assignee
			? [String(metadata.assignee)]
			: [];
	for (const assignee of assignees) {
		if (WORD_TOKEN.test(assignee)) tokens.push(`@${assignee}`);
	}
	if (metadata.dueDate) {
		const date = new Date(metadata.dueDate);
		if (!Number.isNaN(date.getTime())) tokens.push(`^${date.toISOString().slice(0, 10)}`);
	}
	if (metadata.priority) {
		const priority = metadata.priority.toLowerCase();
		const token =
			PRIORITY_SHORTHAND[priority] ??
			(PRIORITY_WORDS.has(priority) ? `!${priority}` : null);
		if (token) tokens.push(token);
	}
	if (metadata.status && WORD_TOKEN.test(metadata.status)) tokens.push(`:${metadata.status}`);
	return tokens;
}

function typeTokens(nodeType: string, metadata: NonNullable<NodeData['metadata']>): string[] {
	const tokens: string[] = [];
	switch (nodeType) {
		case 'textNode':
			if (metadata.fontSize) tokens.push(`size:${metadata.fontSize}`);
			if (metadata.fontWeight && metadata.fontWeight !== 'normal' && metadata.fontWeight !== 400) {
				tokens.push(`weight:${metadata.fontWeight}`);
			}
			if (metadata.fontStyle && metadata.fontStyle !== 'normal') {
				tokens.push(`style:${metadata.fontStyle}`);
			}
			if (metadata.textAlign && metadata.textAlign !== 'left') {
				tokens.push(`align:${metadata.textAlign}`);
			}
			if (metadata.textColor) tokens.push(`color:${metadata.textColor}`);
			break;
		case 'imageNode':
			if (metadata.altText) tokens.push(`alt:${quoted(metadata.altText)}`);
			break;
		case 'codeNode':
			if (metadata.language) tokens.push(`lang:${metadata.language}`);
			if (metadata.fileName && !/\s/.test(metadata.fileName)) {
				tokens.push(`file:${metadata.fileName}`);
			}
			if (metadata.showLineNumbers !== undefined) {
				tokens.push(`lines:${metadata.showLineNumbers ? 'on' : 'off'}`);
			}
			break;
		case 'resourceNode':
			if (metadata.url) tokens.push(`url:${metadata.url}`);
			break;
		case 'annotationNode':
			if (metadata.annotationType) tokens.push(`type:${metadata.annotationType}`);
			break;
		case 'questionNode': {
			tokens.push(`question:${metadata.questionType ?? 'binary'}`);
			const options = metadata.responseFormat?.options?.map((option) => option.label) ?? [];
			if (options.length > 0 && options.every((label) => QUESTION_OPTION.test(label))) {
				tokens.push(`options:[${options.join(',')}]`);
				tokens.push(`multiple:${metadata.responseFormat?.allowMultiple ? 'true' : 'false'}`);
			}
			break;
		}
	}
	if (metadata.title) tokens.push(`title:${quoted(metadata.title)}`);
	return tokens;
}

/** Text that reads back as plain text: no tokens and no outline markers. */
export function isLiteralSafe(text: string): boolean {
	if (!text.trim() || /^\s*(\$|\[|\||&|---)/.test(text)) return false;
	const parsed = parseInput(text);
	return parsed.patterns.length === 0 && parsed.content.trim() === text.trim();
}

function splitLines(text: string | null | undefined): string[] {
	const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
	while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
	while (lines.length > 0 && !lines[0].trim()) lines.shift();
	return lines;
}

/** A short human name for a node: its title, else its first line of text. */
export function nodeLabel(node: NodeData, maxChars = 48): string {
	const metadata = node.metadata ?? {};
	const label =
		metadata.title?.trim() ||
		splitLines(node.content)[0]?.trim() ||
		metadata.extension?.kindLabel ||
		(node.node_type === 'taskNode' ? metadata.tasks?.[0]?.text : undefined) ||
		NODE_TYPE_TRIGGERS[node.node_type ?? 'defaultNode'] ||
		'node';
	return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

export function nodeToOutlineText(node: NodeData): NodeOutlineText {
	const nodeType = node.node_type ?? 'defaultNode';
	const metadata = node.metadata ?? {};

	if (nodeType === 'extensionNode') {
		const extension = metadata.extension;
		const label = extension?.kindLabel ?? extension?.kind ?? 'node';
		return {
			head: `$plugin ${extension?.pluginId ?? 'unknown'} ${quoted(label)}`,
			body: splitLines(node.content),
			tasks: [],
		};
	}

	const tokens = [...universalTokens(metadata), ...typeTokens(nodeType, metadata)];
	let lines = splitLines(
		nodeType === 'groupNode' ? (node.content ?? metadata.label ?? null) : node.content
	);
	if (nodeType === 'imageNode') {
		const imageUrl = String(metadata.imageUrl ?? metadata.url ?? '');
		lines = imageUrl ? [imageUrl, ...lines] : lines;
	}

	// The first line stays on the node line only when it reads back unchanged.
	// Code always goes in the body, where `#include` is not a tag.
	const inlineFirst =
		nodeType !== 'codeNode' && lines.length > 0 && isLiteralSafe(lines[0]);
	const inlineText = inlineFirst ? lines[0].trim() : '';
	const body = inlineFirst ? lines.slice(1) : lines;

	const trigger = NODE_TYPE_TRIGGERS[nodeType] ?? '$note';
	const showTrigger = nodeType !== 'defaultNode' || !inlineText;
	const head = [showTrigger ? trigger : '', inlineText, ...tokens].filter(Boolean).join(' ');

	const tasks =
		nodeType === 'taskNode'
			? (metadata.tasks ?? []).map((task) => ({
					text: task.text.replace(/\s*\n\s*/g, ' '),
					done: task.isComplete === true,
				}))
			: [];

	return { head, body, tasks };
}
