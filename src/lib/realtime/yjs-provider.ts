'use client';

import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { getMindMapRoomName } from '@/lib/realtime/room-names';
import YPartyKitProvider from 'y-partykit/provider';
import * as Y from 'yjs';

const supabase = getSharedSupabaseClient();

export type YjsSyncEnvelope = {
	id: string;
	event: string;
	payload: unknown;
	timestamp: number;
};

export type YjsPresenceMap = Record<string, Array<Record<string, unknown>>>;
export type YjsGraphEntity = 'node' | 'edge';
export type YjsGraphAction = 'add' | 'update' | 'delete';

export type YjsGraphMutation = {
	entity: YjsGraphEntity;
	action: YjsGraphAction;
	id: string;
	value: Record<string, unknown> | null;
	oldValue: Record<string, unknown> | null;
	actorId: string | null;
	timestampMs: number | null;
};

export type ReplaceYjsGraphStateInput = {
	nodes: Array<Record<string, unknown>>;
	edges: Array<Record<string, unknown>>;
	actorId?: string | null;
	event?: string;
	skipHistoryOnce?: boolean;
};

type GraphEventMapping = {
	entity: YjsGraphEntity;
	action: YjsGraphAction;
};

type AwarenessLike = {
	getStates: () => Map<number, unknown>;
	getLocalState: () => unknown;
	setLocalState: (state: unknown) => void;
	on: (event: string, callback: () => void) => void;
	off: (event: string, callback: () => void) => void;
};

type ProviderLike = {
	destroy: () => void;
	awareness: AwarenessLike;
	connect?: () => void;
	disconnect?: () => void;
};

type RoomContext = {
	roomName: string;
	doc: Y.Doc;
	provider: ProviderLike;
	events: Y.Array<YjsSyncEnvelope>;
	nodesById: Y.Map<Record<string, unknown>>;
	edgesById: Y.Map<Record<string, unknown>>;
	meta: Y.Map<unknown>;
	refCount: number;
	subscriberCursors: Map<string, number>;
};

const roomContexts = new Map<string, RoomContext>();
const RECONNECTABLE_MAP_CHANNELS = [
	'sync',
	'cursor',
	'presence',
	'selected-nodes',
] as const;

const GRAPH_EVENT_MAP: Record<string, GraphEventMapping> = {
	'node:create': { entity: 'node', action: 'add' },
	'node:update': { entity: 'node', action: 'update' },
	'node:delete': { entity: 'node', action: 'delete' },
	'edge:create': { entity: 'edge', action: 'add' },
	'edge:update': { entity: 'edge', action: 'update' },
	'edge:delete': { entity: 'edge', action: 'delete' },
};

function generateEventId(): string {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}

	return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateSubscriberCursorId(): string {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}

	return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeHost(hostOrUrl: string): string {
	try {
		return new URL(hostOrUrl).host;
	} catch {
		return hostOrUrl
			.replace(/^wss?:\/\//, '')
			.replace(/^https?:\/\//, '')
			.replace(/\/$/, '');
	}
}

function getPartyKitHost(): string {
	const configured = process.env.NEXT_PUBLIC_PARTYKIT_URL;
	if (configured && configured.trim().length > 0) {
		return normalizeHost(configured);
	}

	if (typeof window !== 'undefined') {
		return window.location.host;
	}

	return '127.0.0.1:1999';
}

function getPartyKitPartyName(): string {
	const configured = process.env.NEXT_PUBLIC_PARTYKIT_PARTY;
	if (configured && configured.trim().length > 0) {
		return configured.trim();
	}

	return 'main';
}

export function getRealtimeRoomName(
	mapId: string,
	channel: 'sync' | 'cursor' | 'presence' | 'selected-nodes' = 'sync'
): string {
	return getMindMapRoomName(mapId, channel);
}

async function getAuthParams(): Promise<Record<string, string>> {
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (session?.access_token) {
			return { token: session.access_token };
		}
	} catch {
		// No-op. Caller will connect without token and be rejected by PartyKit auth.
	}

	return {};
}

function toPresenceMap(awareness: AwarenessLike): YjsPresenceMap {
	const states = awareness.getStates();
	const presenceMap: YjsPresenceMap = {};

	for (const [clientId, rawState] of states.entries()) {
		if (!rawState || typeof rawState !== 'object') continue;

		const state = rawState as Record<string, unknown>;
		const rawPresence = state.presence;
		if (!rawPresence || typeof rawPresence !== 'object') continue;

		const presence = rawPresence as Record<string, unknown>;
		const key = String(presence.id ?? clientId);
		if (!presenceMap[key]) {
			presenceMap[key] = [];
		}
		presenceMap[key].push(presence);
	}

	return presenceMap;
}

function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function cloneRecord(
	value: Record<string, unknown> | null
): Record<string, unknown> | null {
	if (!value) return null;
	return { ...value };
}

import { asNonEmptyString, stableStringify } from '@/lib/realtime/util';

function parsePayloadActorId(payload: unknown): string | null {
	const record = toRecord(payload);
	if (!record) return null;
	const userId = record.userId;
	if (typeof userId === 'string' && userId.trim().length > 0) {
		return userId.trim();
	}
	return null;
}

function parsePayloadTimestamp(payload: unknown): number | null {
	const record = toRecord(payload);
	if (!record) return null;
	const timestamp = record.timestamp;
	if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
		return timestamp;
	}
	return null;
}

function readMetaActorId(meta: Y.Map<unknown>): string | null {
	const actorId = meta.get('lastMutationBy');
	if (typeof actorId !== 'string') return null;
	const trimmed = actorId.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function readMetaTimestampMs(meta: Y.Map<unknown>): number | null {
	const directTimestamp = meta.get('lastMutationTimestamp');
	if (typeof directTimestamp === 'number' && Number.isFinite(directTimestamp)) {
		return directTimestamp;
	}

	const isoTimestamp = meta.get('lastMutationAt');
	if (typeof isoTimestamp === 'string') {
		const parsed = Date.parse(isoTimestamp);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}

	return null;
}

function writeGraphMutationMeta(
	context: RoomContext,
	options: {
		event: string;
		actorId?: string | null;
		timestampMs?: number | null;
		skipHistoryOnce?: boolean;
	}
): void {
	if (yjsPrimaryWritesEnabled()) {
		context.meta.set('stateAuthority', 'yjs_primary');
		context.meta.set('authorityPromotedAt', new Date().toISOString());
	}

	context.meta.set('lastMutationEvent', options.event);
	context.meta.set('lastMutationAt', new Date().toISOString());

	if (
		typeof options.actorId === 'string' &&
		options.actorId.trim().length > 0
	) {
		context.meta.set('lastMutationBy', options.actorId.trim());
	}

	if (
		typeof options.timestampMs === 'number' &&
		Number.isFinite(options.timestampMs)
	) {
		context.meta.set('lastMutationTimestamp', options.timestampMs);
	}

	if (typeof options.skipHistoryOnce === 'boolean') {
		context.meta.set('skipHistoryOnce', options.skipHistoryOnce);
	} else {
		context.meta.set('skipHistoryOnce', false);
	}
}

function getGraphMapping(event: string): GraphEventMapping | null {
	return GRAPH_EVENT_MAP[event] ?? null;
}

function getGraphMap(
	context: RoomContext,
	entity: YjsGraphEntity
): Y.Map<Record<string, unknown>> {
	return entity === 'node' ? context.nodesById : context.edgesById;
}

function getGraphMutationPayload(
	payload: unknown
): { id: string; data: Record<string, unknown> | null } | null {
	const record = toRecord(payload);
	if (!record) return null;

	const id =
		typeof record.id === 'string'
			? record.id
			: typeof toRecord(record.data)?.id === 'string'
				? String((record.data as Record<string, unknown>).id)
				: null;

	if (!id) return null;

	return {
		id,
		data: toRecord(record.data),
	};
}

function normalizeGraphRecord(
	record: Record<string, unknown>,
	id: string
): Record<string, unknown> {
	return {
		...record,
		id,
	};
}

function mergeGraphRecordForUpdate(
	currentRecord: Record<string, unknown> | null,
	nextRecord: Record<string, unknown>
): Record<string, unknown> {
	if (!currentRecord) return nextRecord;

	const merged: Record<string, unknown> = {
		...currentRecord,
		...nextRecord,
	};

	const stableUserId = asNonEmptyString(currentRecord.user_id);
	if (stableUserId) {
		merged.user_id = stableUserId;
	}

	const stableCreatedAt = asNonEmptyString(currentRecord.created_at);
	if (stableCreatedAt) {
		merged.created_at = stableCreatedAt;
	}

	return merged;
}

function createRecordMap(
	records: Array<Record<string, unknown>>
): Map<string, Record<string, unknown>> {
	const mapped = new Map<string, Record<string, unknown>>();
	for (const record of records) {
		if (!record || typeof record !== 'object' || Array.isArray(record)) {
			continue;
		}

		const idValue = record.id;
		if (typeof idValue !== 'string' || idValue.trim().length === 0) {
			continue;
		}

		const id = idValue.trim();
		mapped.set(id, normalizeGraphRecord(record, id));
	}
	return mapped;
}

function recordsEqual(
	left: Record<string, unknown> | null | undefined,
	right: Record<string, unknown> | null | undefined
): boolean {
	return stableStringify(left ?? null) === stableStringify(right ?? null);
}

function replaceGraphMapState(
	yMap: Y.Map<Record<string, unknown>>,
	nextRecords: Map<string, Record<string, unknown>>
): void {
	for (const existingId of Array.from(yMap.keys())) {
		if (!nextRecords.has(existingId)) {
			yMap.delete(existingId);
		}
	}

	for (const [id, nextRecord] of nextRecords) {
		const currentRecord = toRecord(yMap.get(id));
		const mergedRecord = mergeGraphRecordForUpdate(currentRecord, nextRecord);
		if (recordsEqual(currentRecord, mergedRecord)) {
			continue;
		}
		yMap.set(id, mergedRecord);
	}
}

function yjsPrimaryWritesEnabled(): boolean {
	return true;
}

function shiftSubscriberCursors(
	subscriberCursors: Map<string, number>,
	deletedCount: number
): void {
	if (deletedCount <= 0) {
		return;
	}

	for (const [subscriberId, cursor] of subscriberCursors.entries()) {
		subscriberCursors.set(subscriberId, Math.max(0, cursor - deletedCount));
	}
}

export function computeSyncEventPruneCount(
	totalEvents: number,
	maxRetainedEvents: number,
	subscriberCursors: ReadonlyMap<string, number>
): number {
	if (totalEvents <= maxRetainedEvents) {
		return 0;
	}

	const excess = totalEvents - maxRetainedEvents;
	const cursorValues = Array.from(subscriberCursors.values());
	const minCursor =
		cursorValues.length > 0 ? Math.min(...cursorValues) : totalEvents;

	return Math.min(excess, Math.max(0, minCursor));
}

function pruneRetainedSyncEvents(
	context: RoomContext,
	maxRetainedEvents: number
): number {
	const deleteCount = computeSyncEventPruneCount(
		context.events.length,
		maxRetainedEvents,
		context.subscriberCursors
	);

	if (deleteCount <= 0) {
		return 0;
	}

	shiftSubscriberCursors(context.subscriberCursors, deleteCount);
	context.doc.transact(() => {
		context.events.delete(0, deleteCount);
	});

	return deleteCount;
}

/**
 * Returns existing or creates new room context. Does NOT increment refCount —
 * callers that own a lifecycle (subscriptions) must use acquireYjsRoom instead.
 * Internal helpers (applyYjsGraphMutation, sendYjsSyncEvent, etc.) call this
 * directly because they perform single operations without owning a lifecycle.
 */
async function ensureRoomContext(roomName: string): Promise<RoomContext> {
	const existing = roomContexts.get(roomName);
	if (existing) return existing;

	const doc = new Y.Doc();
	const provider = new YPartyKitProvider(getPartyKitHost(), roomName, doc, {
		connect: true,
		party: getPartyKitPartyName(),
		params: getAuthParams,
	}) as unknown as ProviderLike;

	const context: RoomContext = {
		roomName,
		doc,
		provider,
		events: doc.getArray<YjsSyncEnvelope>('sync_events'),
		nodesById: doc.getMap<Record<string, unknown>>('nodesById'),
		edgesById: doc.getMap<Record<string, unknown>>('edgesById'),
		meta: doc.getMap<unknown>('meta'),
		refCount: 0,
		subscriberCursors: new Map<string, number>(),
	};

	roomContexts.set(roomName, context);
	return context;
}

export async function acquireYjsRoom(roomName: string): Promise<RoomContext> {
	const context = await ensureRoomContext(roomName);
	context.refCount += 1;
	return context;
}

export function releaseYjsRoom(roomName: string): void {
	const context = roomContexts.get(roomName);
	if (!context) return;

	context.refCount = Math.max(0, context.refCount - 1);
	if (context.refCount > 0) return;

	context.provider.destroy();
	context.doc.destroy();
	roomContexts.delete(roomName);
}

export async function applyYjsGraphMutation(
	roomName: string,
	event: string,
	payload: unknown
): Promise<boolean> {
	const mapping = getGraphMapping(event);
	if (!mapping) return false;

	const mutationPayload = getGraphMutationPayload(payload);
	if (!mutationPayload) return false;

	const context = await ensureRoomContext(roomName);
	const graphMap = getGraphMap(context, mapping.entity);

	context.doc.transact(() => {
		writeGraphMutationMeta(context, {
			event,
			actorId: parsePayloadActorId(payload),
			timestampMs: parsePayloadTimestamp(payload),
		});

		if (mapping.action === 'delete') {
			graphMap.delete(mutationPayload.id);
			return;
		}

		const currentRecord = toRecord(graphMap.get(mutationPayload.id));
		const nextRecord = mergeGraphRecordForUpdate(currentRecord, {
			...(mutationPayload.data ?? {}),
			id: mutationPayload.id,
		});
		graphMap.set(mutationPayload.id, nextRecord);
	});

	return true;
}

export async function replaceYjsGraphState(
	roomName: string,
	input: ReplaceYjsGraphStateInput
): Promise<void> {
	const context = await ensureRoomContext(roomName);
	const nodeRecords = createRecordMap(input.nodes);
	const edgeRecords = createRecordMap(input.edges);

	context.doc.transact(() => {
		writeGraphMutationMeta(context, {
			event: input.event?.trim() || 'graph:replace',
			actorId: input.actorId,
			timestampMs: Date.now(),
			skipHistoryOnce: input.skipHistoryOnce,
		});

		replaceGraphMapState(context.nodesById, nodeRecords);
		replaceGraphMapState(context.edgesById, edgeRecords);
	});
}

export async function sendYjsSyncEvent(
	roomName: string,
	event: string,
	payload: unknown
): Promise<void> {
	const context = await ensureRoomContext(roomName);
	context.events.push([
		{
			id: generateEventId(),
			event,
			payload,
			timestamp: Date.now(),
		},
	]);
}

export async function subscribeToYjsSyncEvents(
	roomName: string,
	handler: (envelope: YjsSyncEnvelope) => void
): Promise<() => void> {
	const context = await acquireYjsRoom(roomName);
	const subscriberId = generateSubscriberCursorId();
	context.subscriberCursors.set(subscriberId, context.events.length);

	const MAX_RETAINED_EVENTS = 200;

	const processNewEvents = () => {
		let cursor =
			context.subscriberCursors.get(subscriberId) ?? context.events.length;
		const length = context.events.length;
		while (cursor < length) {
			const envelope = context.events.get(cursor);
			cursor += 1;
			if (envelope) handler(envelope);
		}
		context.subscriberCursors.set(subscriberId, cursor);
		pruneRetainedSyncEvents(context, MAX_RETAINED_EVENTS);
	};

	context.events.observe(processNewEvents);
	processNewEvents();

	return () => {
		context.events.unobserve(processNewEvents);
		context.subscriberCursors.delete(subscriberId);
		pruneRetainedSyncEvents(context, MAX_RETAINED_EVENTS);
		releaseYjsRoom(roomName);
	};
}

export async function subscribeToYjsGraphMutations(
	roomName: string,
	handler: (mutation: YjsGraphMutation) => void
): Promise<() => void> {
	const context = await acquireYjsRoom(roomName);

	const observeMap = (
		entity: YjsGraphEntity,
		yMap: Y.Map<Record<string, unknown>>
	) => {
		const observer = (event: Y.YMapEvent<Record<string, unknown>>) => {
			const actorId = readMetaActorId(context.meta);
			const timestampMs = readMetaTimestampMs(context.meta);

			for (const [rawId, change] of event.changes.keys.entries()) {
				const id = String(rawId);
				const action = change.action;
				if (action !== 'add' && action !== 'update' && action !== 'delete') {
					continue;
				}

				const value =
					action === 'delete' ? null : cloneRecord(toRecord(yMap.get(id)));
				const oldValue = cloneRecord(toRecord(change.oldValue));

				handler({
					entity,
					action,
					id,
					value,
					oldValue,
					actorId,
					timestampMs,
				});
			}
		};

		yMap.observe(observer);
		return () => yMap.unobserve(observer);
	};

	const cleanupNodes = observeMap('node', context.nodesById);
	const cleanupEdges = observeMap('edge', context.edgesById);

	return () => {
		cleanupNodes();
		cleanupEdges();
		releaseYjsRoom(roomName);
	};
}

export async function setYjsAwarenessPresence(
	roomName: string,
	presence: Record<string, unknown>
): Promise<void> {
	const context = await ensureRoomContext(roomName);
	const awareness = context.provider.awareness;
	const localState = awareness.getLocalState();
	const nextState =
		localState && typeof localState === 'object'
			? { ...(localState as Record<string, unknown>), presence }
			: { presence };

	awareness.setLocalState(nextState);
}

export async function clearYjsAwarenessPresence(
	roomName: string
): Promise<void> {
	const context = roomContexts.get(roomName);
	if (!context) return;
	context.provider.awareness.setLocalState(null);
}

export async function subscribeToYjsAwareness(
	roomName: string,
	handler: (presenceMap: YjsPresenceMap) => void
): Promise<() => void> {
	const context = await acquireYjsRoom(roomName);
	const awareness = context.provider.awareness;

	const onChange = () => {
		handler(toPresenceMap(awareness));
	};

	awareness.on('change', onChange);
	onChange();

	return () => {
		awareness.off('change', onChange);
		releaseYjsRoom(roomName);
	};
}

export function cleanupAllYjsRooms(): void {
	const entries = Array.from(roomContexts.values());
	roomContexts.clear();
	for (const context of entries) {
		context.provider.destroy();
		context.doc.destroy();
	}
}

export function reconnectYjsRoom(roomName: string): boolean {
	const context = roomContexts.get(roomName);
	if (!context) return false;

	const disconnect = context.provider.disconnect;
	const connect = context.provider.connect;
	if (typeof disconnect !== 'function' || typeof connect !== 'function') {
		console.warn('[yjs-provider] Provider does not support reconnect', {
			roomName,
		});
		return false;
	}

	try {
		disconnect.call(context.provider);
		connect.call(context.provider);
		return true;
	} catch (error) {
		console.warn('[yjs-provider] Failed to reconnect room', {
			roomName,
			error: error instanceof Error ? error.message : 'Unknown reconnect error',
		});
		return false;
	}
}

export function reconnectYjsRoomsForMap(mapId: string): string[] {
	const reconnectedRooms: string[] = [];
	for (const channel of RECONNECTABLE_MAP_CHANNELS) {
		const roomName = getMindMapRoomName(mapId, channel);
		if (reconnectYjsRoom(roomName)) {
			reconnectedRooms.push(roomName);
		}
	}

	if (reconnectedRooms.length > 0) {
		console.info(
			'[yjs-provider] Reconnected map rooms after permission change',
			{
				mapId,
				reconnectedRooms,
			}
		);
	}

	return reconnectedRooms;
}
