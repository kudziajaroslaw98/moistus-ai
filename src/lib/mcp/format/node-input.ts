import { parseInput } from '@/components/node-editor/core/parsers/pattern-extractor';
import { transformDataForNodeType } from '@/components/node-editor/node-creator';
import generateUuid from '@/helpers/generate-uuid';
import type { NodeData } from '@/types/node-data';
import { McpToolError } from '../errors';
import { NODE_TYPE_TRIGGERS } from './node-text';

type NodeMetadata = NonNullable<NodeData['metadata']>;

export interface NodeFields {
	nodeType: string;
	content: string;
	metadata: NodeMetadata;
	/** Metadata keys the text controls for this type; an update clears the ones it leaves out. */
	controlledKeys: string[];
}

/** Set by people in the app, never by the text: an update keeps them. */
const KEPT_ON_UPDATE = new Set([
	'answer',
	'responses',
	'fitMode',
	'anchorNodeId',
	'anchorOffset',
	'isCollapsed',
	'groupId',
	'extension',
	'assigneeUserIds',
]);

/**
 * New metadata for an updated node: keys the text controls are replaced or
 * cleared, everything else (answers, anchors, collapse state…) is kept.
 */
export function mergeMetadataForUpdate(previous: NodeMetadata, fields: NodeFields): NodeMetadata {
	const merged: Record<string, unknown> = { ...previous };
	for (const key of fields.controlledKeys) {
		if (KEPT_ON_UPDATE.has(key) && merged[key] !== undefined) continue;
		const value = (fields.metadata as Record<string, unknown>)[key];
		if (value === undefined) delete merged[key];
		else merged[key] = value;
	}
	return merged as NodeMetadata;
}

export const MAX_NODE_TEXT_CHARS = 10_000;

/** Types an agent may create or switch a node to. */
export const CREATABLE_NODE_TYPES = new Set([
	'defaultNode',
	'textNode',
	'taskNode',
	'imageNode',
	'resourceNode',
	'questionNode',
	'codeNode',
	'annotationNode',
]);

const TYPE_BY_TRIGGER = new Map(
	Object.entries(NODE_TYPE_TRIGGERS).map(([nodeType, trigger]) => [trigger.slice(1), nodeType])
);

/** `task` / `$task` / `taskNode` → `taskNode`; refuses types agents can't create. */
export function resolveCreatableType(name: string): string {
	const key = name.replace(/^\$/, '');
	const nodeType = TYPE_BY_TRIGGER.get(key.toLowerCase()) ?? (CREATABLE_NODE_TYPES.has(key) ? key : null);
	if (!nodeType) {
		throw new McpToolError(
			`Unknown node type "${name}". Use one of: ${[...CREATABLE_NODE_TYPES].map((type) => NODE_TYPE_TRIGGERS[type]).join(', ')}.`
		);
	}
	if (!CREATABLE_NODE_TYPES.has(nodeType)) {
		throw new McpToolError(
			`${NODE_TYPE_TRIGGERS[nodeType]} nodes can't be created by AI apps (plugins, groups and references are made in the app).`
		);
	}
	return nodeType;
}

/** JSON drops undefined anyway; dropping it here keeps diffs and equality honest. */
export function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

/**
 * Node content and metadata from one outline node: the node line goes through
 * the quick-input parser and the editor's own per-type transform, so agent
 * nodes match nodes typed in the app. `|` lines are appended literally.
 */
export function buildNodeFields(
	nodeType: string,
	text: string,
	body: string[],
	tasks: { text: string; done: boolean }[],
	existingTasks: { id: string; text: string }[] = []
): NodeFields {
	const parsed = parseInput(text);
	const parsedMetadata: Record<string, unknown> = { ...parsed.metadata };
	delete parsedMetadata.tasks;

	const head = parsed.content.trim();
	const content = [head, ...body].filter((part, index) => index > 0 || part).join('\n');
	if (content.length > MAX_NODE_TEXT_CHARS) {
		throw new McpToolError(`Node text is ${content.length} characters; the limit is ${MAX_NODE_TEXT_CHARS}.`);
	}

	const unusedTaskIds = new Map(existingTasks.map((task) => [task.text, task.id]));
	const taskRows = tasks.map((task) => {
		const id = unusedTaskIds.get(task.text);
		if (id) unusedTaskIds.delete(task.text);
		return { id: id ?? `task-${generateUuid()}`, text: task.text, isComplete: task.done };
	});

	const fields = transformDataForNodeType(nodeType, {
		content,
		metadata: { ...parsedMetadata, ...(nodeType === 'taskNode' ? { tasks: taskRows } : {}) },
	});
	const rawMetadata = (fields.metadata ?? {}) as Record<string, unknown>;
	const metadata = withoutUndefined(rawMetadata) as NodeMetadata;

	if (nodeType === 'imageNode' && !/^https?:\/\//.test(String(metadata.imageUrl ?? ''))) {
		throw new McpToolError('$image needs an http(s) image URL in its text, e.g. "$image https://example.com/cover.png".');
	}
	if (nodeType === 'resourceNode' && !/^https?:\/\//.test(String(metadata.url ?? ''))) {
		throw new McpToolError('$link needs url:https://… on its line.');
	}
	if (nodeType === 'taskNode' && taskRows.length === 0 && !content) {
		throw new McpToolError('$task needs [ ] rows under it (or some text).');
	}

	return {
		nodeType,
		content: fields.content ?? content,
		metadata,
		controlledKeys: Object.keys(rawMetadata),
	};
}
