import { toEdgeAnimated, toEdgeMarker } from '@/helpers/edge-values';
import { calculateDelta } from '@/helpers/history/delta-calculator';
import { pushGraphMutation } from '@/helpers/partykit/admin';
import { BILLING_SETTINGS_URL } from '@/lib/billing-urls';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { GraphActor } from '@/types/extensions';
import type { NodeData } from '@/types/node-data';
import type { McpToolContext } from '../context';
import { McpToolError } from '../errors';
import type { WorkingGraph } from './edit-plan';

export interface ChangeSet {
	insertNodes: NodeData[];
	updateNodes: NodeData[];
	deleteNodeIds: string[];
	insertEdges: EdgeData[];
	updateEdges: EdgeData[];
	deleteEdgeIds: string[];
}

export interface CommitResult {
	changes: ChangeSet;
	/** False when open canvases may need a reload to show the change. */
	live: boolean;
}

/** A brand-new map created in the same transaction as its first nodes. */
export interface NewMapInput {
	title: string;
	description: string | null;
	layoutDirection: 'LEFT_RIGHT' | 'TOP_BOTTOM' | null;
}

const NODE_FIELDS = ['parent_id', 'content', 'position_x', 'position_y', 'node_type', 'metadata'] as const;

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function diffWorkingGraph(graph: WorkingGraph): ChangeSet {
	const changes: ChangeSet = {
		insertNodes: [],
		updateNodes: [],
		deleteNodeIds: [],
		insertEdges: [],
		updateEdges: [],
		deleteEdgeIds: [],
	};

	for (const [id, node] of graph.nodes) {
		const original = graph.originalNodes.get(id);
		if (!original) changes.insertNodes.push(node);
		else if (NODE_FIELDS.some((field) => !sameJson(original[field], node[field]))) {
			changes.updateNodes.push({ ...node, updated_at: graph.now });
		}
	}
	for (const id of graph.originalNodes.keys()) {
		if (!graph.nodes.has(id)) changes.deleteNodeIds.push(id);
	}

	for (const [id, edge] of graph.edges) {
		const original = graph.originalEdges.get(id);
		if (!original) changes.insertEdges.push(edge);
		else if (!sameJson(original.label, edge.label)) changes.updateEdges.push({ ...edge, updated_at: graph.now });
	}
	for (const [id, edge] of graph.originalEdges) {
		// Edges of deleted nodes go with them in the database (FK cascade).
		if (!graph.edges.has(id) && graph.nodes.has(edge.source) && graph.nodes.has(edge.target)) {
			changes.deleteEdgeIds.push(id);
		}
	}
	return changes;
}

export function isEmptyChangeSet(changes: ChangeSet): boolean {
	return Object.values(changes).every((list) => list.length === 0);
}

/** Drops null object fields recursively, like Postgres jsonb_strip_nulls. */
function stripNulls(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stripNulls);
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, entry]) => entry !== null && entry !== undefined)
			.map(([key, entry]) => [key, stripNulls(entry)])
	);
}

/**
 * History entries use the same node shape as the history snapshots written
 * in SQL (create_history_checkpoint_and_prune / apply_graph_changes), so
 * revert can replay agent events like any other.
 */
export function toHistoryNode(node: NodeData, mapId: string): AppNode {
	const record = node as NodeData & { user_id?: string; aiData?: unknown };
	return stripNulls({
		id: node.id,
		position: { x: node.position_x ?? 0, y: node.position_y ?? 0 },
		type: node.node_type ?? 'defaultNode',
		parentNode: node.parent_id,
		parentId: node.parent_id,
		width: node.width,
		height: node.height,
		data: {
			id: node.id,
			map_id: mapId,
			user_id: record.user_id,
			content: node.content ?? '',
			position_x: node.position_x ?? 0,
			position_y: node.position_y ?? 0,
			width: node.width,
			height: node.height,
			node_type: node.node_type ?? 'defaultNode',
			metadata: node.metadata ?? {},
			aiData: record.aiData ?? {},
			parent_id: node.parent_id,
			created_at: node.created_at,
			updated_at: node.updated_at,
		},
	}) as AppNode;
}

export function toHistoryEdge(edge: EdgeData, mapId: string): AppEdge {
	const animated = toEdgeAnimated(edge.animated);
	const markerEnd = toEdgeMarker(edge.markerEnd);
	const markerStart = toEdgeMarker(edge.markerStart);
	return stripNulls({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: edge.type ?? 'floatingEdge',
		label: edge.label,
		animated,
		style: edge.style,
		markerEnd,
		markerStart,
		data: {
			id: edge.id,
			map_id: mapId,
			user_id: edge.user_id,
			source: edge.source,
			target: edge.target,
			label: edge.label,
			type: edge.type,
			animated,
			style: edge.style,
			markerEnd,
			markerStart,
			metadata: { ...(edge.metadata ?? {}), pathType: edge.metadata?.pathType ?? 'waypoint' },
			aiData: edge.aiData ?? {},
			created_at: edge.created_at,
			updated_at: edge.updated_at,
		},
	}) as AppEdge;
}

export function buildHistoryEvent(graph: WorkingGraph, actor: GraphActor, actionName: string) {
	const toState = (nodes: Iterable<NodeData>, edges: Iterable<EdgeData>) => ({
		nodes: [...nodes].map((node) => toHistoryNode(node, graph.mapId)),
		edges: [...edges].map((edge) => toHistoryEdge(edge, graph.mapId)),
	});
	const delta = calculateDelta(
		toState(graph.originalNodes.values(), graph.originalEdges.values()),
		toState(graph.nodes.values(), graph.edges.values())
	);
	if (!delta) return null;

	return {
		action_name: actionName,
		operation_type: delta.operation,
		entity_type: delta.entityType,
		changes: { ...delta, actor },
	};
}

const nodeRow = (node: NodeData) => ({
	id: node.id,
	parent_id: node.parent_id,
	content: node.content ?? '',
	position_x: node.position_x,
	position_y: node.position_y,
	width: node.width ?? null,
	height: node.height ?? null,
	node_type: node.node_type ?? 'defaultNode',
	metadata: node.metadata ?? {},
});

const edgeRow = (edge: EdgeData) => ({
	id: edge.id,
	source: edge.source,
	target: edge.target,
	label: edge.label ?? null,
	type: edge.type ?? 'waypointEdge',
	metadata: edge.metadata ?? {},
	style: edge.style ?? null,
	animated: toEdgeAnimated(edge.animated),
});

/** Database errors as instructions the agent can act on. */
export function explainCommitError(message: string, newNodes: number, upgradeUrl: string): string {
	const nodeLimit = message.match(/NODE_LIMIT_REACHED: map has (\d+) of (\d+) nodes/);
	if (nodeLimit) {
		return `Node limit: this map's owner's plan allows ${nodeLimit[2]} nodes per map and it would go past that (this call adds ${newNodes}). Nothing was written. Add fewer nodes, or upgrade: ${upgradeUrl}`;
	}
	const mapLimit = message.match(/MAP_LIMIT_REACHED: owner has (\d+) of (\d+) maps/);
	if (mapLimit) {
		return `Map limit: your plan allows ${mapLimit[2]} maps and you have ${mapLimit[1]}. Nothing was created. Add to an existing map, or upgrade: ${upgradeUrl}`;
	}
	if (message.includes('GRAPH_CHANGED')) {
		return 'The map changed while you were editing it (a node was deleted or edited). Nothing was written. Read the map again and retry.';
	}
	if (/row-level security|permission denied/i.test(message)) {
		return "You can't edit this map (you need to be its owner or an editor). Nothing was written.";
	}
	return `Shiko couldn't save the change: ${message}. Nothing was written.`;
}

/**
 * Writes the change set and its history event in one transaction (the
 * apply_graph_changes RPC, run as the user so RLS applies), then pushes the
 * same change into the map's live room so open canvases update.
 */
export async function commitWorkingGraph(
	ctx: McpToolContext,
	graph: WorkingGraph,
	options: { actor: GraphActor; actionName: string; newMap?: NewMapInput }
): Promise<CommitResult> {
	const changes = diffWorkingGraph(graph);
	const history = buildHistoryEvent(graph, options.actor, options.actionName);

	const { error } = await ctx.supabase.rpc('apply_graph_changes', {
		p_map_id: graph.mapId,
		p_insert_nodes: changes.insertNodes.map(nodeRow),
		p_update_nodes: changes.updateNodes.map(nodeRow),
		p_delete_node_ids: changes.deleteNodeIds,
		p_insert_edges: changes.insertEdges.map(edgeRow),
		p_update_edges: changes.updateEdges.map((edge) => ({ id: edge.id, label: edge.label ?? null })),
		p_delete_edge_ids: changes.deleteEdgeIds,
		p_history: history,
		p_new_map: options.newMap
			? {
					title: options.newMap.title,
					description: options.newMap.description,
					layout_direction: options.newMap.layoutDirection,
				}
			: null,
	});
	if (error) {
		throw new McpToolError(
			explainCommitError(error.message, changes.insertNodes.length, `${ctx.appOrigin}${BILLING_SETTINGS_URL}`)
		);
	}

	const live = await pushGraphMutation({
		mapId: graph.mapId,
		actorId: `agent:${ctx.clientId}`,
		upsertNodes: [...changes.insertNodes, ...changes.updateNodes].map((node) => ({
			...node,
			map_id: graph.mapId,
			metadata: node.metadata ?? {},
			aiData: (node as { aiData?: unknown }).aiData ?? {},
		})),
		upsertEdges: [...changes.insertEdges, ...changes.updateEdges].map((edge) => ({ ...edge, map_id: graph.mapId })),
		deleteNodeIds: changes.deleteNodeIds,
		deleteEdgeIds: [
			...changes.deleteEdgeIds,
			...[...graph.originalEdges.values()]
				.filter((edge) => !graph.edges.has(edge.id) && !changes.deleteEdgeIds.includes(edge.id))
				.map((edge) => edge.id),
		],
	}).catch((pushError) => {
		console.warn('[mcp] live push failed', pushError);
		return false;
	});

	return { changes, live };
}
