import type * as Y from 'yjs';

/**
 * A graph write made outside the browser (Shiko MCP), mirrored into the
 * map's sync room so open canvases apply it like any collaborator's edit.
 *
 * PartyKit is deployed separately and can't import from src/: the record
 * merge below duplicates mergeGraphRecordForUpdate in
 * src/lib/realtime/yjs-provider.ts (parity test: graph-mutation.test.ts).
 */
export type GraphMutationPayload = {
	mapId: string;
	actorId: string;
	upsertNodes: Array<Record<string, unknown>>;
	upsertEdges: Array<Record<string, unknown>>;
	deleteNodeIds: string[];
	deleteEdgeIds: string[];
};

const MAX_RECORDS = 5000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const hasId = (value: unknown): value is Record<string, unknown> & { id: string } =>
	isRecord(value) && typeof value.id === 'string' && value.id.length > 0;

const isIdList = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((id) => typeof id === 'string' && id.length > 0);

export function parseGraphMutationPayload(body: unknown): GraphMutationPayload | null {
	if (!isRecord(body)) return null;
	const { mapId, actorId, upsertNodes, upsertEdges, deleteNodeIds, deleteEdgeIds } = body;
	if (typeof mapId !== 'string' || typeof actorId !== 'string' || !actorId.trim()) return null;
	if (!Array.isArray(upsertNodes) || !upsertNodes.every(hasId)) return null;
	if (!Array.isArray(upsertEdges) || !upsertEdges.every(hasId)) return null;
	if (!isIdList(deleteNodeIds) || !isIdList(deleteEdgeIds)) return null;

	const total = upsertNodes.length + upsertEdges.length + deleteNodeIds.length + deleteEdgeIds.length;
	if (total > MAX_RECORDS) return null;

	return { mapId, actorId: actorId.trim(), upsertNodes, upsertEdges, deleteNodeIds, deleteEdgeIds };
}

function nonEmptyString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/** Keeps who created a record and when, whatever the update says. */
export function mergeGraphRecord(
	current: Record<string, unknown> | null,
	next: Record<string, unknown>
): Record<string, unknown> {
	if (!current) return next;
	const merged: Record<string, unknown> = { ...current, ...next };
	const stableUserId = nonEmptyString(current.user_id);
	if (stableUserId) merged.user_id = stableUserId;
	const stableCreatedAt = nonEmptyString(current.created_at);
	if (stableCreatedAt) merged.created_at = stableCreatedAt;
	return merged;
}

/**
 * Applies the write in one Yjs transaction. `lastMutationBy` is the agent id
 * (not a user id), so every tab applies it, and `skipHistoryOnce` stops any
 * history projection from recording it twice: the server already wrote history.
 */
export function applyGraphMutationToDoc(doc: Y.Doc, payload: GraphMutationPayload): void {
	const meta = doc.getMap<unknown>('meta');
	const nodesById = doc.getMap<Record<string, unknown>>('nodesById');
	const edgesById = doc.getMap<Record<string, unknown>>('edgesById');
	const now = Date.now();

	doc.transact(() => {
		meta.set('lastMutationEvent', 'graph:agent-write');
		meta.set('lastMutationAt', new Date(now).toISOString());
		meta.set('lastMutationBy', payload.actorId);
		meta.set('lastMutationTimestamp', now);
		meta.set('skipHistoryOnce', true);

		for (const record of payload.upsertNodes) {
			const id = record.id as string;
			const current = nodesById.get(id);
			nodesById.set(id, mergeGraphRecord(isRecord(current) ? current : null, record));
		}
		for (const record of payload.upsertEdges) {
			const id = record.id as string;
			const current = edgesById.get(id);
			edgesById.set(id, mergeGraphRecord(isRecord(current) ? current : null, record));
		}
		for (const id of payload.deleteEdgeIds) edgesById.delete(id);
		for (const id of payload.deleteNodeIds) nodesById.delete(id);
	});
}
