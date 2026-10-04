import generateUuid from '@/helpers/generate-uuid';
import type { AppState } from '@/store/app-state';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { GraphActor, GraphOp, GraphOpsResult } from '@/types/extensions';
import type { NodeData } from '@/types/node-data';

/** Max serialized size of one plugin's `metadata.ext[pluginId]` entry on a node. */
export const MAX_EXT_DATA_BYTES = 16 * 1024;

/** UTF-8 size without TextEncoder, which jsdom (component tests) doesn't provide. */
function utf8ByteLength(value: string): number {
	let bytes = 0;
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
	}
	return bytes;
}

function canEditMap(state: AppState): boolean {
	const isOwner = Boolean(
		state.currentUser &&
			state.mindMap &&
			state.mindMap.user_id === state.currentUser.id
	);
	return isOwner || state.permissions.can_edit === true;
}

/** Returns an error message when node data breaks the extension data contract. */
function validateNodeData(
	data: Partial<NodeData> | undefined,
	actor: GraphActor
): string | null {
	if (!data) return null;

	let serialized: string;
	try {
		serialized = JSON.stringify(data);
	} catch {
		return 'Node data must be JSON-serializable';
	}
	if (serialized === undefined) return 'Node data must be JSON-serializable';

	const ext = data.metadata?.ext;
	if (!ext) return null;

	for (const [namespace, value] of Object.entries(ext)) {
		if (actor.kind === 'plugin' && namespace !== actor.id) {
			return `Plugin ${actor.id} cannot write metadata.ext["${namespace}"]`;
		}
		const size = utf8ByteLength(JSON.stringify(value) ?? '');
		if (size > MAX_EXT_DATA_BYTES) {
			return `metadata.ext["${namespace}"] is ${size} bytes (max ${MAX_EXT_DATA_BYTES})`;
		}
	}
	return null;
}

function validateOp(op: GraphOp, actor: GraphActor): string | null {
	switch (op.type) {
		case 'createNode':
		case 'updateNode':
			return validateNodeData(op.data, actor);
		default:
			return null;
	}
}

async function dispatchOp(state: AppState, op: GraphOp): Promise<void> {
	switch (op.type) {
		case 'createNode':
			await state.addNode({
				parentNode: op.parentNodeId
					? (state.getNode(op.parentNodeId) ?? null)
					: null,
				content: op.content,
				nodeType: op.nodeType,
				data: op.data,
				position: op.position,
				nodeId: op.nodeId,
			});
			return;
		case 'updateNode':
			await state.updateNode({ nodeId: op.nodeId, data: op.data });
			return;
		case 'deleteNodes': {
			const ids = new Set(op.nodeIds);
			await state.deleteNodes(state.nodes.filter((n) => ids.has(n.id)));
			return;
		}
		case 'createEdge':
			await state.addEdge(op.source, op.target, op.data ?? {});
			return;
		case 'updateEdge':
			await state.updateEdge({ edgeId: op.edgeId, data: op.data });
			return;
		case 'deleteEdges': {
			const ids = new Set(op.edgeIds);
			await state.deleteEdges(state.edges.filter((e) => ids.has(e.id)));
			return;
		}
	}
}

/**
 * `addNode`/`addEdge` show a toast and resolve normally when they fail, so a step
 * only counts once its result is actually in the store.
 */
function findMissingResult(state: AppState, op: GraphOp): string | null {
	switch (op.type) {
		case 'createNode':
			return state.nodes.some((node) => node.id === op.nodeId)
				? null
				: 'Node was not created';
		case 'createEdge':
			return state.edges.some(
				(edge) =>
					edge.source === op.source &&
					edge.target === op.target &&
					edge.data?.aiData?.isSuggested !== true
			)
				? null
				: 'Connection was not created';
		default:
			return null;
	}
}

/**
 * Single entry point for programmatic graph changes (plugins, recipes, future API).
 *
 * Wraps the existing store actions so realtime sync, offline queueing and node-limit
 * checks keep working, and adds what those actions don't enforce on their own:
 * edit permission, extension data limits, and one history event per batch attributed
 * to the actor.
 */
export async function applyGraphOps(
	getState: () => AppState,
	ops: GraphOp[],
	actor: GraphActor,
	options: { label?: string } = {}
): Promise<GraphOpsResult> {
	const initialState = getState();

	if (!initialState.mapId) {
		return { ok: false, applied: 0, error: 'No map is open' };
	}
	if (!canEditMap(initialState)) {
		return { ok: false, applied: 0, error: 'Edit permission is required' };
	}
	for (const op of ops) {
		const error = validateOp(op, actor);
		if (error) return { ok: false, applied: 0, error };
	}

	const prev: { nodes: AppNode[]; edges: AppEdge[] } = {
		nodes: initialState.nodes,
		edges: initialState.edges,
	};
	let applied = 0;
	let failure: string | null = null;

	// New nodes get their id up front so each step can be verified.
	const preparedOps = ops.map((op) =>
		op.type === 'createNode' && !op.nodeId ? { ...op, nodeId: generateUuid() } : op
	);

	initialState.beginHistoryBatch();
	try {
		for (const op of preparedOps) {
			await dispatchOp(getState(), op);
			const missing = findMissingResult(getState(), op);
			if (missing) throw new Error(missing);
			applied += 1;
		}
	} catch (error) {
		failure = error instanceof Error ? error.message : String(error);
	} finally {
		getState().endHistoryBatch();
	}

	const finalState = getState();
	await finalState.persistDeltaEvent(
		options.label ?? `${actor.kind}:${actor.id}`,
		prev,
		{ nodes: finalState.nodes, edges: finalState.edges },
		{ actor }
	);

	return failure
		? { ok: false, applied, error: failure }
		: { ok: true, applied };
}
