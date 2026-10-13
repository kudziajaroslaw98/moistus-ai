import { defaultEdgeData } from '@/constants/default-edge-data';
import generateUuid from '@/helpers/generate-uuid';
import type { EdgeData } from '@/types/edge-data';
import type { LayoutDirection } from '@/types/layout-types';
import type { NodeData } from '@/types/node-data';
import { McpToolError } from '../errors';
import {
	buildNodeFields,
	mergeMetadataForUpdate,
	resolveCreatableType,
	withoutUndefined,
} from '../format/node-input';
import { parseOutline, type OutlineNodeLine } from '../format/outline-parse';
import { resolveShortId } from '../format/short-ids';
import { buildMapTree, type MapTree } from './tree';

/** One step of an edit_map call. Ids are short ids, full UUIDs, or &refs. */
export type MapEditOp =
	| { op: 'outline'; under?: string; text: string }
	| { op: 'add'; under?: string; text: string }
	| {
			op: 'update';
			id: string;
			text?: string;
			type?: string;
			tags?: string[];
			title?: string;
			collapsed?: boolean;
	  }
	| { op: 'move'; id: string; under: string | null }
	| { op: 'delete'; ids: string[]; withDescendants?: boolean }
	| { op: 'link'; from: string; to: string; label?: string }
	| { op: 'unlink'; from: string; to: string }
	| { op: 'label'; from: string; to: string; label: string };

export const MAX_NEW_NODES_PER_CALL = 500;
const MAX_REPORTED_ERRORS = 10;

/**
 * An in-memory copy of a map that ops change in order. Nothing touches the
 * database until every op has passed; the diff against the original decides
 * what gets written.
 */
export interface WorkingGraph {
	mapId: string;
	userId: string;
	direction: LayoutDirection | null;
	nodes: Map<string, NodeData>;
	edges: Map<string, EdgeData>;
	originalNodes: ReadonlyMap<string, NodeData>;
	originalEdges: ReadonlyMap<string, EdgeData>;
	refs: Map<string, string>;
	/** New or moved nodes that need a position. */
	placeIds: Set<string>;
	now: string;
}

export function createWorkingGraph(input: {
	mapId: string;
	userId: string;
	direction: LayoutDirection | null;
	nodes: NodeData[];
	edges: EdgeData[];
}): WorkingGraph {
	return {
		mapId: input.mapId,
		userId: input.userId,
		direction: input.direction,
		nodes: new Map(input.nodes.map((node) => [node.id, { ...node }])),
		edges: new Map(input.edges.map((edge) => [edge.id, { ...edge }])),
		originalNodes: new Map(input.nodes.map((node) => [node.id, node])),
		originalEdges: new Map(input.edges.map((edge) => [edge.id, edge])),
		refs: new Map(),
		placeIds: new Set(),
		now: new Date().toISOString(),
	};
}

function editDistance(a: string, b: string): number {
	const row = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const current = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
			previous = current;
		}
	}
	return row[b.length];
}

/** `&name`, short id, `[short id]` or UUID → node id in the working graph. */
export function resolveTarget(graph: WorkingGraph, token: string): string {
	const trimmed = token.trim();
	if (trimmed.startsWith('&')) {
		const name = trimmed.slice(1);
		const id = graph.refs.get(name);
		if (id && graph.nodes.has(id)) return id;
		const close = [...graph.refs.keys()].find((ref) => editDistance(ref, name) <= 2);
		throw new McpToolError(
			`unknown ref &${name}${close ? ` (did you mean &${close}?)` : ''}. Refs only exist within one call, after the line that names them.`
		);
	}

	const result = resolveShortId(trimmed, graph.nodes.keys());
	if (result.ok) return result.id;
	if (result.reason === 'ambiguous') {
		throw new McpToolError(`id "${trimmed}" matches several nodes; use more characters`);
	}
	if (result.reason === 'invalid') {
		throw new McpToolError(`"${trimmed}" is not a node id or &ref`);
	}
	throw new McpToolError(`no node "${trimmed}" (deleted, or from another map?)`);
}

function currentTree(graph: WorkingGraph): MapTree {
	return buildMapTree([...graph.nodes.values()], [...graph.edges.values()], graph.direction);
}

function descendantsOf(tree: MapTree, id: string): string[] {
	const result: string[] = [];
	const stack = [...(tree.children.get(id) ?? [])];
	while (stack.length > 0) {
		const next = stack.pop()!;
		result.push(next);
		stack.push(...(tree.children.get(next) ?? []));
	}
	return result;
}

function addEdge(graph: WorkingGraph, source: string, target: string, label?: string): void {
	const defaults = defaultEdgeData();
	const edge: EdgeData = {
		...defaults,
		id: generateUuid(),
		map_id: graph.mapId,
		user_id: graph.userId,
		source,
		target,
		label: label?.trim() || null,
		created_at: graph.now,
		updated_at: graph.now,
	};
	graph.edges.set(edge.id, edge);
}

function edgesBetween(graph: WorkingGraph, source: string, target: string): EdgeData[] {
	return [...graph.edges.values()].filter((edge) => edge.source === source && edge.target === target);
}

/** Annotations created under a node hang off it (anchored), like in the app. */
function isAnchorHost(graph: WorkingGraph, id: string | null): id is string {
	return Boolean(id) && graph.nodes.get(id!)?.node_type !== 'annotationNode';
}

function createNode(graph: WorkingGraph, line: OutlineNodeLine, parentId: string | null): string {
	const nodeType = resolveCreatableType(line.trigger ?? 'note');
	const fields = buildNodeFields(nodeType, line.text, line.body, line.tasks);
	if (!fields.content && nodeType !== 'taskNode') {
		throw new McpToolError('a node needs some text');
	}

	const anchored = nodeType === 'annotationNode' && isAnchorHost(graph, parentId);
	const id = generateUuid();
	const node = {
		id,
		map_id: graph.mapId,
		user_id: graph.userId,
		parent_id: anchored ? null : parentId,
		content: fields.content,
		metadata: anchored ? { ...fields.metadata, anchorNodeId: parentId! } : fields.metadata,
		node_type: nodeType,
		position_x: 0,
		position_y: 0,
		width: null,
		height: null,
		created_at: graph.now,
		updated_at: graph.now,
	} as NodeData;

	graph.nodes.set(id, node);
	graph.placeIds.add(id);
	if (parentId && !anchored) addEdge(graph, parentId, id);
	return id;
}

function nameRef(graph: WorkingGraph, ref: string | undefined, id: string): void {
	if (!ref) return;
	if (graph.refs.has(ref)) throw new McpToolError(`&${ref} is used twice`);
	graph.refs.set(ref, id);
}

function addOutline(graph: WorkingGraph, text: string, under: string | undefined): string[] {
	const parsed = parseOutline(text);
	const underId = under ? resolveTarget(graph, under) : null;
	const ids: string[] = [];
	const created: string[] = [];

	parsed.nodes.forEach((line, index) => {
		const parentId = line.parent === null ? underId : ids[line.parent];
		try {
			if (line.existingId) {
				if (line.parent !== null) {
					throw new McpToolError(`[${line.existingId}] is an existing node and can't be nested here; use a move op`);
				}
				ids[index] = resolveTarget(graph, line.existingId);
			} else {
				ids[index] = createNode(graph, line, parentId);
				created.push(ids[index]);
			}
			nameRef(graph, line.ref, ids[index]);
		} catch (error) {
			if (error instanceof McpToolError) throw new McpToolError(`line ${line.line}: ${error.message}`);
			throw error;
		}
	});

	for (const link of parsed.links) {
		try {
			linkNodes(graph, resolveTarget(graph, link.from), resolveTarget(graph, link.to), link.label);
		} catch (error) {
			if (error instanceof McpToolError) throw new McpToolError(`line ${link.line}: ${error.message}`);
			throw error;
		}
	}
	return created;
}

function linkNodes(graph: WorkingGraph, from: string, to: string, label?: string): void {
	if (from === to) throw new McpToolError("a node can't link to itself");
	const existing = edgesBetween(graph, from, to);
	if (existing.length === 0) {
		addEdge(graph, from, to, label);
		return;
	}
	if (label !== undefined) {
		for (const edge of existing) graph.edges.set(edge.id, { ...edge, label: label.trim() || null });
	}
}

function linksForPair(graph: WorkingGraph, from: string, to: string): EdgeData[] {
	const forward = edgesBetween(graph, from, to);
	return forward.length > 0 ? forward : edgesBetween(graph, to, from);
}

function updateNode(graph: WorkingGraph, op: Extract<MapEditOp, { op: 'update' }>): void {
	const id = resolveTarget(graph, op.id);
	const node = graph.nodes.get(id)!;
	const currentType = node.node_type ?? 'defaultNode';

	if (currentType === 'extensionNode') {
		throw new McpToolError("plugin nodes belong to their plugin; you can move, link or delete them, not edit them");
	}
	const textOrTypeChange = op.text !== undefined || op.type !== undefined;
	if (textOrTypeChange && (currentType === 'groupNode' || currentType === 'referenceNode')) {
		throw new McpToolError(`${currentType === 'groupNode' ? 'group' : 'reference'} nodes can only get tags, a title or collapsed`);
	}

	let nodeType = op.type ? resolveCreatableType(op.type) : currentType;
	let content = node.content ?? '';
	let metadata = { ...(node.metadata ?? {}) };

	if (op.text !== undefined) {
		const parsed = parseOutline(op.text);
		if (parsed.nodes.length !== 1 || parsed.links.length > 0 || parsed.nodes[0].existingId) {
			throw new McpToolError('update text must be one node: a line plus optional | lines or [ ] rows');
		}
		const line = parsed.nodes[0];
		if (line.trigger) nodeType = resolveCreatableType(line.trigger);
		const fields = buildNodeFields(nodeType, line.text, line.body, line.tasks, node.metadata?.tasks ?? []);
		content = fields.content;
		metadata = mergeMetadataForUpdate(metadata, fields);
	} else if (nodeType !== currentType) {
		const fields = buildNodeFields(nodeType, content, [], []);
		metadata = mergeMetadataForUpdate(metadata, fields);
	}

	if (op.tags !== undefined) metadata.tags = op.tags.length > 0 ? op.tags.map((tag) => tag.replace(/^#/, '')) : undefined;
	if (op.title !== undefined) metadata.title = op.title.trim() || undefined;
	if (op.collapsed !== undefined) metadata.isCollapsed = op.collapsed;

	graph.nodes.set(id, {
		...node,
		node_type: nodeType as NodeData['node_type'],
		content,
		metadata: withoutUndefined(metadata),
	});
}

function moveNode(graph: WorkingGraph, op: Extract<MapEditOp, { op: 'move' }>): void {
	const id = resolveTarget(graph, op.id);
	const target = op.under === null ? null : resolveTarget(graph, op.under);
	const tree = currentTree(graph);
	const descendants = descendantsOf(tree, id);
	if (target === id || (target && descendants.includes(target))) {
		throw new McpToolError("a node can't move under itself or its own children");
	}

	const node = graph.nodes.get(id)!;
	const oldParent = tree.parentOf.get(id);
	if (oldParent) {
		for (const edge of edgesBetween(graph, oldParent, id)) graph.edges.delete(edge.id);
	}

	const metadata = { ...(node.metadata ?? {}) };
	if (node.node_type === 'annotationNode') {
		if (isAnchorHost(graph, target)) metadata.anchorNodeId = target;
		else delete metadata.anchorNodeId;
		delete metadata.anchorOffset;
		graph.nodes.set(id, { ...node, parent_id: null, metadata });
	} else {
		graph.nodes.set(id, { ...node, parent_id: target });
		if (target && edgesBetween(graph, target, id).length === 0) addEdge(graph, target, id);
	}

	graph.placeIds.add(id);
	for (const descendant of descendants) graph.placeIds.add(descendant);
}

function deleteNodes(graph: WorkingGraph, op: Extract<MapEditOp, { op: 'delete' }>): void {
	const ids = new Set(op.ids.map((token) => resolveTarget(graph, token)));
	if (op.withDescendants) {
		const tree = currentTree(graph);
		for (const id of [...ids]) for (const descendant of descendantsOf(tree, id)) ids.add(descendant);
	}

	for (const id of ids) {
		graph.nodes.delete(id);
		graph.placeIds.delete(id);
	}
	for (const edge of [...graph.edges.values()]) {
		if (ids.has(edge.source) || ids.has(edge.target)) graph.edges.delete(edge.id);
	}
	// Children that stay become top-level instead of pointing at a missing parent.
	for (const node of graph.nodes.values()) {
		if (node.parent_id && ids.has(node.parent_id)) graph.nodes.set(node.id, { ...node, parent_id: null });
	}
}

function applyOne(graph: WorkingGraph, op: MapEditOp): void {
	switch (op.op) {
		case 'outline':
			addOutline(graph, op.text, op.under);
			return;
		case 'add': {
			const parsed = parseOutline(op.text);
			if (parsed.nodes.filter((line) => line.parent === null).length !== 1) {
				throw new McpToolError('add takes one node (children allowed); use outline for several');
			}
			addOutline(graph, op.text, op.under);
			return;
		}
		case 'update':
			updateNode(graph, op);
			return;
		case 'move':
			moveNode(graph, op);
			return;
		case 'delete':
			deleteNodes(graph, op);
			return;
		case 'link':
			linkNodes(graph, resolveTarget(graph, op.from), resolveTarget(graph, op.to), op.label);
			return;
		case 'unlink': {
			const from = resolveTarget(graph, op.from);
			const to = resolveTarget(graph, op.to);
			const links = linksForPair(graph, from, to);
			if (links.length === 0) throw new McpToolError(`no link between ${op.from} and ${op.to}`);
			for (const edge of links) graph.edges.delete(edge.id);
			return;
		}
		case 'label': {
			const from = resolveTarget(graph, op.from);
			const to = resolveTarget(graph, op.to);
			const links = linksForPair(graph, from, to);
			if (links.length === 0) throw new McpToolError(`no link between ${op.from} and ${op.to}; use link`);
			for (const edge of links) graph.edges.set(edge.id, { ...edge, label: op.label.trim() || null });
			return;
		}
	}
}

/**
 * Runs every op against the working graph. All errors are collected and
 * reported together; any error means nothing is written.
 */
export function applyEditOps(graph: WorkingGraph, ops: MapEditOp[]): void {
	const errors: string[] = [];
	ops.forEach((op, index) => {
		if (errors.length >= MAX_REPORTED_ERRORS) return;
		try {
			applyOne(graph, op);
		} catch (error) {
			if (!(error instanceof McpToolError)) throw error;
			errors.push(`op ${index + 1} (${op.op}): ${error.message}`);
		}
	});

	const newNodes = [...graph.nodes.keys()].filter((id) => !graph.originalNodes.has(id)).length;
	if (newNodes > MAX_NEW_NODES_PER_CALL) {
		errors.push(`this call adds ${newNodes} nodes; the limit per call is ${MAX_NEW_NODES_PER_CALL}. Split it into several calls.`);
	}

	if (errors.length > 0) {
		throw new McpToolError(`Nothing was written:\n${errors.join('\n')}`);
	}
}
