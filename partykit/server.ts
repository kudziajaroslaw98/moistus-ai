import type * as Party from 'partykit/server';
import { onConnect as onYjsConnect } from 'y-partykit';
import * as Y from 'yjs';
import {
	isAdminAccessRevokedPath,
	isAdminCollaboratorEventPath,
	isAdminPath,
	isAdminPermissionsUpdatePath,
	isAdminRevokePath,
	parseMindMapRoom,
	parseRoomNameFromRequest,
	readAdminToken,
	readAuthToken,
	verifySupabaseJwt,
} from './auth';

type MapAccess = {
	role: string;
	canView: boolean;
	canComment: boolean;
	canEdit: boolean;
	updatedAt: string | null;
};

type PartyKitEnv = Record<string, unknown>;

type GraphRow = {
	map_id: string;
	nodes: unknown;
	edges: unknown;
};

type NodeRow = {
	id: string;
	map_id: string;
	user_id: string | null;
	content: string | null;
	position_x: number | null;
	position_y: number | null;
	width: number | null;
	height: number | null;
	node_type: string | null;
	metadata: Record<string, unknown> | null;
	aiData: Record<string, unknown> | null;
	parent_id: string | null;
	created_at: string | null;
	updated_at: string | null;
};

type EdgeRow = {
	id: string;
	map_id: string;
	user_id: string | null;
	source: string | null;
	target: string | null;
	label: string | null;
	animated: boolean | string | null;
	style: Record<string, unknown> | null;
	markerEnd: string | null;
	markerStart: string | null;
	metadata: Record<string, unknown> | null;
	aiData: Record<string, unknown> | null;
	created_at: string | null;
	updated_at: string | null;
};

type GraphSnapshotNode = {
	id: string;
	type: string;
	position: { x: number; y: number };
	data: Record<string, unknown>;
	width?: number | null;
	height?: number | null;
	parentId?: string;
	zIndex?: number;
};

type GraphSnapshotEdge = {
	id: string;
	source: string;
	target: string;
	type: string;
	label?: string;
	animated: boolean;
	markerEnd?: string | null;
	markerStart?: string | null;
	style?: Record<string, unknown> | null;
	data: Record<string, unknown>;
};

type GraphSnapshot = {
	nodes: GraphSnapshotNode[];
	edges: GraphSnapshotEdge[];
};

type HistoryPatchOp = {
	id: string;
	type: 'node' | 'edge';
	op: 'add' | 'remove' | 'patch';
	value?: Record<string, unknown>;
	removedValue?: Record<string, unknown>;
	patch?: Record<string, unknown>;
	reversePatch?: Record<string, unknown>;
};

type HistoryDelta = {
	operation: 'add' | 'update' | 'delete' | 'batch';
	entityType: 'node' | 'edge' | 'mixed';
	changes: HistoryPatchOp[];
};

type GraphProjectionMeta = {
	lastMutationEvent: string | null;
	lastMutationBy: string | null;
	skipHistoryOnce: boolean;
};

const UPSERT_BATCH_SIZE = 200;
const DELETE_BATCH_SIZE = 200;
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SKIP_PATCH_KEYS = new Set([
	'selected',
	'dragging',
	'measured',
	'updated_at',
]);
const PERMISSION_ROLES = new Set(['owner', 'editor', 'commentator', 'viewer']);

type PermissionRole = 'owner' | 'editor' | 'commentator' | 'viewer';

type PermissionSnapshotEvent = {
	type: 'permissions:snapshot' | 'permissions:update';
	mapId: string;
	targetUserId: string;
	role: PermissionRole;
	can_view: boolean;
	can_comment: boolean;
	can_edit: boolean;
	updatedAt: string;
};

type PermissionRevokedEvent = {
	type: 'permissions:revoked';
	mapId: string;
	targetUserId: string;
	reason: 'access_revoked';
	revokedAt: string;
};

type PermissionEvent = PermissionSnapshotEvent | PermissionRevokedEvent;

type CollaboratorEntry = {
	shareId: string;
	mapId: string;
	userId: string;
	role: PermissionRole;
	can_view: boolean;
	can_comment: boolean;
	can_edit: boolean;
	display_name: string | null;
	full_name: string | null;
	email: string | null;
	avatar_url: string | null;
	is_anonymous: boolean;
	created_at: string;
	updated_at: string;
};

type SharingCollaboratorsSnapshotEvent = {
	type: 'sharing:collaborators:snapshot';
	mapId: string;
	occurredAt: string;
	collaborators: CollaboratorEntry[];
};

type SharingCollaboratorUpsertEvent = {
	type: 'sharing:collaborator:upsert';
	mapId: string;
	occurredAt: string;
	collaborator: CollaboratorEntry;
};

type SharingCollaboratorRemoveEvent = {
	type: 'sharing:collaborator:remove';
	mapId: string;
	occurredAt: string;
	removedShareIds: string[];
};

type SharingAdminEventPayload =
	| SharingCollaboratorUpsertEvent
	| SharingCollaboratorRemoveEvent;

type RealtimeConnectionState = {
	userId: string | null;
	mapId: string | null;
	channel: string | null;
};

/** Timing-safe string comparison via HMAC (works on CF Workers where timingSafeEqual is unavailable). */
async function hmacEqual(a: string, b: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode('partykit-admin-compare'),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const [macA, macB] = await Promise.all([
		crypto.subtle.sign('HMAC', key, encoder.encode(a)),
		crypto.subtle.sign('HMAC', key, encoder.encode(b)),
	]);
	const viewA = new Uint8Array(macA);
	const viewB = new Uint8Array(macB);
	if (viewA.length !== viewB.length) return false;
	let diff = 0;
	for (let i = 0; i < viewA.length; i++) {
		diff |= viewA[i] ^ viewB[i];
	}
	return diff === 0;
}

function unauthorized(message = 'Unauthorized'): Response {
	return new Response(message, { status: 401 });
}

function forbidden(message = 'Forbidden'): Response {
	return new Response(message, { status: 403 });
}

function badRequest(message = 'Bad request'): Response {
	return new Response(message, { status: 400 });
}

type AdminRoomResolution = {
	parsedRoom: ReturnType<typeof parseMindMapRoom>;
	source: 'request' | 'room' | 'none';
	requestRoomName: string | null;
};

function resolveAdminRoom(
	requestUrl: string,
	roomId: string
): AdminRoomResolution {
	const requestRoomName = parseRoomNameFromRequest(requestUrl);
	if (requestRoomName) {
		const parsedFromRequest = parseMindMapRoom(requestRoomName);
		if (parsedFromRequest) {
			return {
				parsedRoom: parsedFromRequest,
				source: 'request',
				requestRoomName,
			};
		}
	}

	const parsedFromRoom = parseMindMapRoom(roomId);
	if (parsedFromRoom) {
		return {
			parsedRoom: parsedFromRoom,
			source: 'room',
			requestRoomName,
		};
	}

	return {
		parsedRoom: null,
		source: 'none',
		requestRoomName,
	};
}

function getEnvString(
	env: PartyKitEnv,
	key: string
): string | undefined {
	const value = env[key];
	return typeof value === 'string' ? value : undefined;
}

function getConfiguredSupabaseBaseUrl(env: PartyKitEnv): string | null {
	const baseUrl =
		getEnvString(env, 'SUPABASE_URL') ||
		getEnvString(env, 'NEXT_PUBLIC_SUPABASE_URL');
	if (!baseUrl) return null;
	return baseUrl.replace(/\/+$/, '');
}

function getSupabaseBaseUrl(env: PartyKitEnv): string {
	const baseUrl = getConfiguredSupabaseBaseUrl(env);
	if (!baseUrl) {
		throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
	}
	return baseUrl;
}

function getSupabaseServiceRole(env: PartyKitEnv): string {
	const key =
		getEnvString(env, 'SUPABASE_SERVICE_ROLE') ||
		getEnvString(env, 'SUPABASE_SERVICE_ROLE_KEY');
	if (!key) {
		throw new Error('SUPABASE_SERVICE_ROLE (or _KEY) is required');
	}
	return key;
}

function getSupabaseJwksUrl(env: PartyKitEnv): string | undefined {
	const configured = getEnvString(env, 'SUPABASE_JWKS_URL')?.trim();
	if (configured) return configured;

	const baseUrl = getConfiguredSupabaseBaseUrl(env);
	return baseUrl ? `${baseUrl}/auth/v1/.well-known/jwks.json` : undefined;
}

function getSupabaseJwtIssuer(env: PartyKitEnv): string | undefined {
	const configured = getEnvString(env, 'SUPABASE_JWT_ISSUER')?.trim();
	if (configured) return configured;

	const baseUrl = getConfiguredSupabaseBaseUrl(env);
	return baseUrl ? `${baseUrl}/auth/v1` : undefined;
}

function createRestUrl(
	env: PartyKitEnv,
	table: string,
	params: Record<string, string>
): string {
	const url = new URL(`${getSupabaseBaseUrl(env)}/rest/v1/${table}`);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url.toString();
}

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
	if (values.length === 0) return [];
	const chunks: T[][] = [];
	for (let index = 0; index < values.length; index += chunkSize) {
		chunks.push(values.slice(index, index + chunkSize));
	}
	return chunks;
}

function quotePostgrestValue(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function querySupabaseRows<T>(
	env: PartyKitEnv,
	table: string,
	params: Record<string, string>
): Promise<T[]> {
	const serviceRole = getSupabaseServiceRole(env);
	const response = await fetch(createRestUrl(env, table, params), {
		headers: {
			Accept: 'application/json',
			apikey: serviceRole,
			Authorization: `Bearer ${serviceRole}`,
		},
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(
			`Supabase query failed (${table}): ${response.status} ${message}`
		);
	}

	const data = (await response.json()) as T[];
	return Array.isArray(data) ? data : [];
}

async function upsertSupabaseRows(
	env: PartyKitEnv,
	table: string,
	rows: Array<Record<string, unknown>>,
	onConflict = 'id'
): Promise<void> {
	if (rows.length === 0) return;

	const serviceRole = getSupabaseServiceRole(env);
	const response = await fetch(
		createRestUrl(env, table, { on_conflict: onConflict }),
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Prefer: 'resolution=merge-duplicates',
				apikey: serviceRole,
				Authorization: `Bearer ${serviceRole}`,
			},
			body: JSON.stringify(rows),
		}
	);

	if (!response.ok) {
		const message = await response.text();
		throw new Error(
			`Supabase upsert failed (${table}): ${response.status} ${message}`
		);
	}
}

async function insertSupabaseRows<T>(
	env: PartyKitEnv,
	table: string,
	rows: Array<Record<string, unknown>>
): Promise<T[]> {
	if (rows.length === 0) return [];

	const serviceRole = getSupabaseServiceRole(env);
	const response = await fetch(createRestUrl(env, table, {}), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Prefer: 'return=representation',
			apikey: serviceRole,
			Authorization: `Bearer ${serviceRole}`,
		},
		body: JSON.stringify(rows),
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(
			`Supabase insert failed (${table}): ${response.status} ${message}`
		);
	}

	const data = (await response.json()) as T[];
	return Array.isArray(data) ? data : [];
}

async function deleteSupabaseRowsByIds(
	env: PartyKitEnv,
	table: string,
	mapId: string,
	ids: string[]
): Promise<void> {
	if (ids.length === 0) return;

	const serviceRole = getSupabaseServiceRole(env);
	for (const chunk of chunkArray(ids, DELETE_BATCH_SIZE)) {
		const idFilter = `in.(${chunk.map(quotePostgrestValue).join(',')})`;
		const response = await fetch(
			createRestUrl(env, table, {
				map_id: `eq.${mapId}`,
				id: idFilter,
			}),
			{
				method: 'DELETE',
				headers: {
					Accept: 'application/json',
					apikey: serviceRole,
					Authorization: `Bearer ${serviceRole}`,
				},
			}
		);

		if (!response.ok) {
			const message = await response.text();
			throw new Error(
				`Supabase delete failed (${table}): ${response.status} ${message}`
			);
		}
	}
}

function isUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isPermissionRole(value: unknown): value is PermissionRole {
	return typeof value === 'string' && PERMISSION_ROLES.has(value);
}

function setConnectionState(
	connection: Party.Connection,
	state: RealtimeConnectionState
): void {
	const statefulConnection = connection as Party.Connection & {
		setState?: (state: unknown) => void;
	};
	if (typeof statefulConnection.setState === 'function') {
		statefulConnection.setState(state);
	}
}

function readConnectionState(
	connection: Party.Connection
): RealtimeConnectionState | null {
	const statefulConnection = connection as Party.Connection & {
		state?: unknown;
		getState?: () => unknown;
	};
	const rawState =
		typeof statefulConnection.getState === 'function'
			? statefulConnection.getState()
			: statefulConnection.state;
	if (!rawState || typeof rawState !== 'object') return null;

	const record = rawState as Record<string, unknown>;
	return {
		userId: typeof record.userId === 'string' ? record.userId : null,
		mapId: typeof record.mapId === 'string' ? record.mapId : null,
		channel: typeof record.channel === 'string' ? record.channel : null,
	};
}

function listConnectionsForUser(
	room: Party.Room,
	userId: string
): Party.Connection[] {
	const taggedConnections = Array.from(room.getConnections(`user:${userId}`));
	if (taggedConnections.length > 0) {
		return taggedConnections;
	}

	return Array.from(room.getConnections()).filter(
		(connection) => readConnectionState(connection)?.userId === userId
	);
}

function closeConnectionsForUsers(
	room: Party.Room,
	userIds: string[],
	code: number,
	reason: string
): { closedConnections: number; fallbackClosedConnections: number } {
	const closed = new Set<Party.Connection>();
	let fallbackClosedConnections = 0;

	for (const userId of userIds) {
		const taggedConnections = room.getConnections(`user:${userId}`);
		let closedForUser = 0;

		for (const connection of taggedConnections) {
			if (closed.has(connection)) continue;
			connection.close(code, reason);
			closed.add(connection);
			closedForUser += 1;
		}

		if (closedForUser > 0) {
			continue;
		}

		for (const connection of room.getConnections()) {
			const state = readConnectionState(connection);
			if (!state || state.userId !== userId || closed.has(connection)) {
				continue;
			}
			connection.close(code, reason);
			closed.add(connection);
			fallbackClosedConnections += 1;
		}
	}

	return {
		closedConnections: closed.size,
		fallbackClosedConnections,
	};
}

async function getMapAccess(
	env: PartyKitEnv,
	userId: string,
	mapId: string
): Promise<MapAccess | null> {
	const ownedMaps = await querySupabaseRows<{
		id: string;
		updated_at: string | null;
	}>(env, 'mind_maps', {
		select: 'id,updated_at',
		id: `eq.${mapId}`,
		user_id: `eq.${userId}`,
		limit: '1',
	});

	if (ownedMaps.length > 0) {
		return {
			role: 'owner',
			canView: true,
			canComment: true,
			canEdit: true,
			updatedAt: ownedMaps[0]?.updated_at ?? new Date().toISOString(),
		};
	}

	const accessRows = await querySupabaseRows<{
		role: string | null;
		can_view: boolean | null;
		can_comment: boolean | null;
		can_edit: boolean | null;
		updated_at: string | null;
	}>(env, 'share_access', {
		select: 'role,can_view,can_comment,can_edit,updated_at',
		map_id: `eq.${mapId}`,
		user_id: `eq.${userId}`,
		status: 'eq.active',
		order: 'updated_at.desc',
		limit: '1',
	});

	const access = accessRows[0];
	if (!access) return null;

	return {
		role: access.role || 'viewer',
		canView: Boolean(access.can_view),
		canComment: Boolean(access.can_comment),
		canEdit: Boolean(access.can_edit),
		updatedAt: access.updated_at ?? null,
	};
}

async function authorizeRoomRequest(
	request: Request,
	env: PartyKitEnv
): Promise<Response | Request> {
	const roomName = parseRoomNameFromRequest(request);
	if (!roomName) {
		return badRequest('Room name is required');
	}

	const parsedRoom = parseMindMapRoom(roomName);
	if (!parsedRoom) {
		return badRequest('Invalid room name format');
	}

	const token = readAuthToken(request);
	if (!token) {
		return unauthorized('Missing bearer token');
	}

	let userId: string;
	try {
		const claims = await verifySupabaseJwt(token, {
			SUPABASE_JWKS_URL: getSupabaseJwksUrl(env),
			SUPABASE_JWT_ISSUER: getSupabaseJwtIssuer(env),
			SUPABASE_JWT_AUDIENCE: getEnvString(env, 'SUPABASE_JWT_AUDIENCE'),
		});
		userId = claims.sub;
	} catch {
		return unauthorized('Invalid auth token');
	}

	let access: MapAccess | null = null;
	try {
		access = await getMapAccess(env, userId, parsedRoom.mapId);
	} catch (error) {
		console.error('[partykit] Failed to validate permissions:', error);
		return new Response('Failed to validate permissions', { status: 500 });
	}

	if (!access || !access.canView) {
		return forbidden('Map access denied');
	}

	const headers = new Headers(request.headers);
	headers.set('x-auth-user-id', userId);
	headers.set('x-auth-map-id', parsedRoom.mapId);
	headers.set('x-auth-room-name', parsedRoom.roomName);
	headers.set('x-auth-role', access.role);
	headers.set('x-auth-can-view', String(access.canView));
	headers.set('x-auth-can-comment', String(access.canComment));
	headers.set('x-auth-can-edit', String(access.canEdit));
	headers.set(
		'x-auth-permissions-updated-at',
		access.updatedAt ?? new Date().toISOString()
	);

	return new Request(request, { headers });
}

function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function normalizeNodeRecord(
	mapId: string,
	nodeId: string,
	value: unknown
): Record<string, unknown> | null {
	const record = toRecord(value);
	if (!record) return null;

	const position = toRecord(record.position);
	const positionX =
		typeof record.position_x === 'number'
			? record.position_x
			: typeof position?.x === 'number'
				? position.x
				: null;
	const positionY =
		typeof record.position_y === 'number'
			? record.position_y
			: typeof position?.y === 'number'
				? position.y
				: null;

	return {
		...record,
		id: nodeId,
		map_id: mapId,
		position_x: positionX,
		position_y: positionY,
		updated_at:
			typeof record.updated_at === 'string'
				? record.updated_at
				: new Date().toISOString(),
	};
}

function normalizeEdgeRecord(
	mapId: string,
	edgeId: string,
	value: unknown
): Record<string, unknown> | null {
	const record = toRecord(value);
	if (!record) return null;
	if (typeof record.source !== 'string' || typeof record.target !== 'string') {
		return null;
	}

	return {
		...record,
		id: edgeId,
		map_id: mapId,
		updated_at:
			typeof record.updated_at === 'string'
				? record.updated_at
				: new Date().toISOString(),
	};
}

async function loadMapGraph(
	env: PartyKitEnv,
	mapId: string
): Promise<GraphRow | null> {
	const rows = await querySupabaseRows<GraphRow>(
		env,
		'map_graph_aggregated_view',
		{
			select: 'map_id,nodes,edges',
			map_id: `eq.${mapId}`,
			limit: '1',
		}
	);
	return rows[0] ?? null;
}

function toRecordOrNull(value: unknown): Record<string, unknown> | null {
	return toRecord(value);
}

function toNumberOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toStringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function toBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true') return true;
		if (normalized === 'false') return false;
	}
	return Boolean(value);
}

function normalizeNodeRow(value: Record<string, unknown>): NodeRow | null {
	const id = toStringOrNull(value.id);
	const mapId = toStringOrNull(value.map_id);
	if (!id || !mapId) return null;

	return {
		id,
		map_id: mapId,
		user_id: toStringOrNull(value.user_id),
		content: toStringOrNull(value.content),
		position_x: toNumberOrNull(value.position_x),
		position_y: toNumberOrNull(value.position_y),
		width: toNumberOrNull(value.width),
		height: toNumberOrNull(value.height),
		node_type: toStringOrNull(value.node_type),
		metadata: toRecordOrNull(value.metadata),
		aiData: toRecordOrNull(value.aiData),
		parent_id: toStringOrNull(value.parent_id),
		created_at: toStringOrNull(value.created_at),
		updated_at: toStringOrNull(value.updated_at),
	};
}

function normalizeEdgeRow(value: Record<string, unknown>): EdgeRow | null {
	const id = toStringOrNull(value.id);
	const mapId = toStringOrNull(value.map_id);
	const source = toStringOrNull(value.source);
	const target = toStringOrNull(value.target);
	if (!id || !mapId || !source || !target) return null;

	return {
		id,
		map_id: mapId,
		user_id: toStringOrNull(value.user_id),
		source,
		target,
		label: toStringOrNull(value.label),
		animated:
			typeof value.animated === 'boolean' || typeof value.animated === 'string'
				? value.animated
				: null,
		style: toRecordOrNull(value.style),
		markerEnd: toStringOrNull(value.markerEnd),
		markerStart: toStringOrNull(value.markerStart),
		metadata: toRecordOrNull(value.metadata),
		aiData: toRecordOrNull(value.aiData),
		created_at: toStringOrNull(value.created_at),
		updated_at: toStringOrNull(value.updated_at),
	};
}

function inferEdgeType(row: EdgeRow): string {
	const isSuggested = row.aiData?.isSuggested;
	if (isSuggested === true || isSuggested === 'true') {
		return 'suggestedConnection';
	}

	const pathType = row.metadata?.pathType;
	if (pathType === 'waypoint') {
		return 'waypointEdge';
	}

	return 'floatingEdge';
}

function graphSnapshotNodeFromRow(row: NodeRow): GraphSnapshotNode {
	const data: Record<string, unknown> = {
		id: row.id,
		map_id: row.map_id,
		user_id: row.user_id,
		parent_id: row.parent_id,
		content: row.content ?? '',
		position_x: row.position_x ?? 0,
		position_y: row.position_y ?? 0,
		node_type: row.node_type ?? 'defaultNode',
		width: row.width,
		height: row.height,
		metadata: row.metadata ?? {},
		aiData: row.aiData ?? {},
		created_at: row.created_at ?? new Date().toISOString(),
		updated_at: row.updated_at ?? new Date().toISOString(),
	};

	const snapshotNode: GraphSnapshotNode = {
		id: row.id,
		type: row.node_type ?? 'defaultNode',
		position: {
			x: row.position_x ?? 0,
			y: row.position_y ?? 0,
		},
		data,
		width: row.width,
		height: row.height,
	};

	if (row.parent_id) {
		snapshotNode.parentId = row.parent_id;
	}

	if ((row.node_type ?? '') === 'commentNode') {
		snapshotNode.zIndex = 100;
	}

	return snapshotNode;
}

function graphSnapshotEdgeFromRow(row: EdgeRow): GraphSnapshotEdge {
	const animated = toBoolean(row.animated);
	const style = row.style ?? { stroke: '#6c757d', strokeWidth: 2 };

	const data: Record<string, unknown> = {
		id: row.id,
		map_id: row.map_id,
		user_id: row.user_id,
		source: row.source ?? '',
		target: row.target ?? '',
		label: row.label,
		animated,
		style,
		markerEnd: row.markerEnd,
		markerStart: row.markerStart,
		metadata: row.metadata ?? {},
		aiData: row.aiData ?? {},
		created_at: row.created_at ?? new Date().toISOString(),
		updated_at: row.updated_at ?? new Date().toISOString(),
	};

	return {
		id: row.id,
		source: row.source ?? '',
		target: row.target ?? '',
		type: inferEdgeType(row),
		label: row.label ?? undefined,
		animated,
		markerEnd: row.markerEnd,
		markerStart: row.markerStart,
		style,
		data,
	};
}

function buildGraphSnapshot(
	nodes: NodeRow[],
	edges: EdgeRow[]
): GraphSnapshot {
	return {
		nodes: nodes
			.map(graphSnapshotNodeFromRow)
			.sort((left, right) => left.id.localeCompare(right.id)),
		edges: edges
			.map(graphSnapshotEdgeFromRow)
			.sort((left, right) => left.id.localeCompare(right.id)),
	};
}

function isSafePatchKey(key: string): boolean {
	return !['__proto__', 'constructor', 'prototype'].includes(key);
}

function isPrimitive(value: unknown): boolean {
	return (
		value === null ||
		(typeof value !== 'object' && typeof value !== 'function')
	);
}

function canonicalizeForComparison(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => canonicalizeForComparison(entry));
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		const normalized: Record<string, unknown> = {};

		for (const key of Object.keys(record).sort()) {
			if (!isSafePatchKey(key)) continue;
			normalized[key] = canonicalizeForComparison(record[key]);
		}

		return normalized;
	}

	return value;
}

function deepEqual(left: unknown, right: unknown): boolean {
	return (
		JSON.stringify(canonicalizeForComparison(left)) ===
		JSON.stringify(canonicalizeForComparison(right))
	);
}

function toNodeProjectionComparable(
	row: NodeRow
): Record<string, unknown> {
	return {
		id: row.id,
		map_id: row.map_id,
		user_id: row.user_id,
		content: row.content,
		position_x: row.position_x,
		position_y: row.position_y,
		width: row.width,
		height: row.height,
		node_type: row.node_type,
		metadata: row.metadata ?? null,
		aiData: row.aiData ?? null,
		parent_id: row.parent_id,
		created_at: row.created_at,
	};
}

function toEdgeProjectionComparable(
	row: EdgeRow
): Record<string, unknown> {
	return {
		id: row.id,
		map_id: row.map_id,
		user_id: row.user_id,
		source: row.source,
		target: row.target,
		label: row.label,
		animated: toBoolean(row.animated),
		style: row.style ?? null,
		markerEnd: row.markerEnd,
		markerStart: row.markerStart,
		metadata: row.metadata ?? null,
		aiData: row.aiData ?? null,
		created_at: row.created_at,
	};
}

function areNodeRowsEquivalentForProjection(
	left: NodeRow,
	right: NodeRow
): boolean {
	return deepEqual(
		toNodeProjectionComparable(left),
		toNodeProjectionComparable(right)
	);
}

function areEdgeRowsEquivalentForProjection(
	left: EdgeRow,
	right: EdgeRow
): boolean {
	return deepEqual(
		toEdgeProjectionComparable(left),
		toEdgeProjectionComparable(right)
	);
}

function collectDiff(
	basePath: string,
	left: unknown,
	right: unknown,
	out: Record<string, unknown>
): void {
	if (deepEqual(left, right)) return;

	if (
		isPrimitive(left) ||
		isPrimitive(right) ||
		typeof left !== 'object' ||
		typeof right !== 'object'
	) {
		out[basePath || ''] = right;
		return;
	}

	const leftRecord = left as Record<string, unknown>;
	const rightRecord = right as Record<string, unknown>;
	const keys = new Set([
		...Object.keys(leftRecord),
		...Object.keys(rightRecord),
	]);

	for (const key of keys) {
		if (SKIP_PATCH_KEYS.has(key) || !isSafePatchKey(key)) continue;
		const nextPath = basePath ? `${basePath}.${key}` : key;

		if (!(key in rightRecord)) {
			out[nextPath] = undefined;
			continue;
		}

		if (!(key in leftRecord)) {
			out[nextPath] = rightRecord[key];
			continue;
		}

		collectDiff(nextPath, leftRecord[key], rightRecord[key], out);
	}
}

function diffToDottedPatch(
	left: Record<string, unknown>,
	right: Record<string, unknown>
): Record<string, unknown> {
	const patch: Record<string, unknown> = {};
	collectDiff('', left, right, patch);
	delete patch.id;
	return patch;
}

function getByPath(source: unknown, path: string): unknown {
	if (!path) return source;
	const segments = path.split('.');
	let current: unknown = source;
	for (const segment of segments) {
		if (!isSafePatchKey(segment)) return undefined;
		if (!current || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

function createReversePatch(
	original: Record<string, unknown>,
	forwardPatch: Record<string, unknown>
): Record<string, unknown> {
	const reverse: Record<string, unknown> = {};
	for (const path of Object.keys(forwardPatch)) {
		reverse[path] = getByPath(original, path);
	}
	return reverse;
}

function minimizeNode(node: GraphSnapshotNode): Record<string, unknown> {
	const nodeData = toRecord(node.data) ?? {};
	const result: Record<string, unknown> = {
		id: node.id,
		type: node.type,
		position: node.position,
		data: node.data,
	};

	const width =
		typeof node.width === 'number'
			? node.width
			: toNumberOrNull(nodeData.width);
	const height =
		typeof node.height === 'number'
			? node.height
			: toNumberOrNull(nodeData.height);
	const parentId =
		typeof node.parentId === 'string'
			? node.parentId
			: toStringOrNull(nodeData.parent_id);

	if (typeof width === 'number') result.width = width;
	if (typeof height === 'number') result.height = height;
	if (typeof parentId === 'string') result.parentId = parentId;
	if (typeof node.zIndex === 'number') result.zIndex = node.zIndex;

	return result;
}

function minimizeEdge(edge: GraphSnapshotEdge): Record<string, unknown> {
	const edgeData = toRecord(edge.data) ?? {};
	const label =
		typeof edge.label === 'string'
			? edge.label
			: toStringOrNull(edgeData.label);
	const markerEnd =
		typeof edge.markerEnd === 'string'
			? edge.markerEnd
			: toStringOrNull(edgeData.markerEnd);
	const markerStart =
		typeof edge.markerStart === 'string'
			? edge.markerStart
			: toStringOrNull(edgeData.markerStart);
	const style =
		edge.style ?? toRecordOrNull(edgeData.style) ?? null;
	const animated =
		typeof edge.animated === 'boolean'
			? edge.animated
			: toBoolean(edgeData.animated);

	return {
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: edge.type,
		data: edge.data,
		label: label ?? null,
		animated,
		style,
		markerEnd: markerEnd ?? null,
		markerStart: markerStart ?? null,
	};
}

function calculateHistoryDelta(
	previous: GraphSnapshot,
	next: GraphSnapshot
): HistoryDelta | null {
	const changes: HistoryPatchOp[] = [];

	const previousNodeMap = new Map(previous.nodes.map((node) => [node.id, node]));
	const nextNodeMap = new Map(next.nodes.map((node) => [node.id, node]));
	const previousEdgeMap = new Map(previous.edges.map((edge) => [edge.id, edge]));
	const nextEdgeMap = new Map(next.edges.map((edge) => [edge.id, edge]));

	for (const [id, node] of nextNodeMap) {
		if (!previousNodeMap.has(id)) {
			changes.push({
				id,
				type: 'node',
				op: 'add',
				value: minimizeNode(node),
			});
		}
	}

	for (const [id, node] of previousNodeMap) {
		if (!nextNodeMap.has(id)) {
			changes.push({
				id,
				type: 'node',
				op: 'remove',
				removedValue: minimizeNode(node),
			});
		}
	}

	for (const [id, node] of nextNodeMap) {
		const previousNode = previousNodeMap.get(id);
		if (!previousNode) continue;
		const patch = diffToDottedPatch(
			previousNode as unknown as Record<string, unknown>,
			node as unknown as Record<string, unknown>
		);
		if (Object.keys(patch).length === 0) continue;
		changes.push({
			id,
			type: 'node',
			op: 'patch',
			patch,
			reversePatch: createReversePatch(
				previousNode as unknown as Record<string, unknown>,
				patch
			),
		});
	}

	for (const [id, edge] of nextEdgeMap) {
		if (!previousEdgeMap.has(id)) {
			changes.push({
				id,
				type: 'edge',
				op: 'add',
				value: minimizeEdge(edge),
			});
		}
	}

	for (const [id, edge] of previousEdgeMap) {
		if (!nextEdgeMap.has(id)) {
			changes.push({
				id,
				type: 'edge',
				op: 'remove',
				removedValue: minimizeEdge(edge),
			});
		}
	}

	for (const [id, edge] of nextEdgeMap) {
		const previousEdge = previousEdgeMap.get(id);
		if (!previousEdge) continue;
		const patch = diffToDottedPatch(
			previousEdge as unknown as Record<string, unknown>,
			edge as unknown as Record<string, unknown>
		);
		if (Object.keys(patch).length === 0) continue;
		changes.push({
			id,
			type: 'edge',
			op: 'patch',
			patch,
			reversePatch: createReversePatch(
				previousEdge as unknown as Record<string, unknown>,
				patch
			),
		});
	}

	if (changes.length === 0) return null;

	const operation: HistoryDelta['operation'] =
		changes.length === 1
			? changes[0].op === 'patch'
				? 'update'
				: changes[0].op === 'remove'
					? 'delete'
					: 'add'
			: 'batch';

	const entityType: HistoryDelta['entityType'] = changes.every(
		(change) => change.type === 'node'
	)
		? 'node'
		: changes.every((change) => change.type === 'edge')
			? 'edge'
			: 'mixed';

	return { operation, entityType, changes };
}

function readActorIdFromChangeValue(value: unknown): string | null {
	const record = toRecord(value);
	if (!record) return null;

	const directUserId = toStringOrNull(record.user_id);
	if (isUuid(directUserId)) return directUserId;

	const data = toRecord(record.data);
	const nestedUserId = toStringOrNull(data?.user_id);
	if (isUuid(nestedUserId)) return nestedUserId;

	return null;
}

function extractActorIdFromDelta(delta: HistoryDelta): string | null {
	for (const change of delta.changes) {
		const actorFromValue = readActorIdFromChangeValue(change.value);
		if (actorFromValue) return actorFromValue;

		const actorFromRemovedValue = readActorIdFromChangeValue(change.removedValue);
		if (actorFromRemovedValue) return actorFromRemovedValue;
	}
	return null;
}

function inferActionName(delta: HistoryDelta, mutationEvent: string | null): string {
	if (mutationEvent) {
		switch (mutationEvent) {
			case 'node:create':
				return 'addNode';
			case 'node:update':
				return 'saveNodeProperties';
			case 'node:delete': {
				const removedNodes = delta.changes.filter(
					(change) => change.type === 'node' && change.op === 'remove'
				).length;
				return removedNodes > 1 ? 'deleteNodes' : 'deleteNode';
			}
			case 'edge:create':
				return 'addEdge';
			case 'edge:update':
				return 'updateEdge';
			case 'edge:delete':
				return 'deleteEdge';
			case 'layout:apply':
				return 'applyLayout';
			case 'layout:apply-selected':
				return 'applyLayoutToSelected';
			case 'history:revert':
				return 'historyRevert';
			default:
				break;
		}
	}

	if (delta.operation === 'add') {
		return delta.entityType === 'edge' ? 'addEdge' : 'addNode';
	}
	if (delta.operation === 'delete') {
		return delta.entityType === 'edge' ? 'deleteEdge' : 'deleteNode';
	}
	if (delta.operation === 'update') {
		return delta.entityType === 'edge' ? 'updateEdge' : 'saveNodeProperties';
	}
	return 'syncGraph';
}

function readProjectionMeta(meta: Y.Map<unknown>): GraphProjectionMeta {
	const lastMutationEventRaw = meta.get('lastMutationEvent');
	const lastMutationByRaw = meta.get('lastMutationBy');
	const skipHistoryOnceRaw = meta.get('skipHistoryOnce');

	const lastMutationEvent =
		typeof lastMutationEventRaw === 'string' &&
		lastMutationEventRaw.trim().length > 0
			? lastMutationEventRaw.trim()
			: null;
	const lastMutationBy =
		typeof lastMutationByRaw === 'string' && isUuid(lastMutationByRaw)
			? lastMutationByRaw
			: null;

	return {
		lastMutationEvent,
		lastMutationBy,
		skipHistoryOnce: skipHistoryOnceRaw === true,
	};
}

async function loadMapRows(
	env: PartyKitEnv,
	mapId: string
): Promise<{ nodes: NodeRow[]; edges: EdgeRow[] }> {
	const [nodes, edges] = await Promise.all([
		querySupabaseRows<NodeRow>(env, 'nodes', {
			select:
				'id,map_id,user_id,content,position_x,position_y,width,height,node_type,metadata,aiData,parent_id,created_at,updated_at',
			map_id: `eq.${mapId}`,
			order: 'id.asc',
			limit: '100000',
		}),
		querySupabaseRows<EdgeRow>(env, 'edges', {
			select:
				'id,map_id,user_id,source,target,label,animated,style,markerEnd,markerStart,metadata,aiData,created_at,updated_at',
			map_id: `eq.${mapId}`,
			order: 'id.asc',
			limit: '100000',
		}),
	]);

	return { nodes, edges };
}

async function getMapOwnerId(
	env: PartyKitEnv,
	mapId: string
): Promise<string | null> {
	const rows = await querySupabaseRows<{ user_id: string | null }>(
		env,
		'mind_maps',
		{
			select: 'user_id',
			id: `eq.${mapId}`,
			limit: '1',
		}
	);
	const ownerId = rows[0]?.user_id;
	return isUuid(ownerId) ? ownerId : null;
}

type ShareAccessWithProfileRow = {
	id: number;
	map_id: string;
	user_id: string;
	role: string | null;
	can_view: boolean | null;
	can_comment: boolean | null;
	can_edit: boolean | null;
	display_name: string | null;
	full_name: string | null;
	email: string | null;
	avatar_url: string | null;
	is_anonymous: boolean | null;
	created_at: string | null;
	updated_at: string | null;
	status: string | null;
};

function toCollaboratorEntry(
	row: ShareAccessWithProfileRow
): CollaboratorEntry | null {
	if (!row?.map_id || !row?.user_id) return null;
	const role = isPermissionRole(row.role) ? row.role : 'viewer';
	const createdAt = row.created_at ?? new Date().toISOString();
	const updatedAt = row.updated_at ?? createdAt;

	return {
		shareId: String(row.id),
		mapId: row.map_id,
		userId: row.user_id,
		role,
		can_view: Boolean(row.can_view),
		can_comment: Boolean(row.can_comment),
		can_edit: Boolean(row.can_edit),
		display_name: row.display_name,
		full_name: row.full_name,
		email: row.email,
		avatar_url: row.avatar_url,
		is_anonymous: Boolean(row.is_anonymous),
		created_at: createdAt,
		updated_at: updatedAt,
	};
}

async function loadCollaboratorsSnapshotForMap(
	env: PartyKitEnv,
	mapId: string
): Promise<CollaboratorEntry[]> {
	const rows = await querySupabaseRows<ShareAccessWithProfileRow>(
		env,
		'share_access_with_profiles',
		{
			select:
				'id,map_id,user_id,role,can_view,can_comment,can_edit,display_name,full_name,email,avatar_url,is_anonymous,created_at,updated_at,status',
			map_id: `eq.${mapId}`,
			status: 'eq.active',
			order: 'created_at.desc',
			limit: '100000',
		}
	);

	return rows
		.map(toCollaboratorEntry)
		.filter((entry): entry is CollaboratorEntry => Boolean(entry));
}

function isSharingAdminEventPayload(
	value: Record<string, unknown>
): value is SharingAdminEventPayload {
	if (
		typeof value.type !== 'string' ||
		typeof value.mapId !== 'string' ||
		typeof value.occurredAt !== 'string'
	) {
		return false;
	}

	if (value.type === 'sharing:collaborator:upsert') {
		const collaborator = value.collaborator as Record<string, unknown> | undefined;
		if (!collaborator || typeof collaborator !== 'object') return false;
		return (
			typeof collaborator.shareId === 'string' &&
			typeof collaborator.mapId === 'string' &&
			typeof collaborator.userId === 'string' &&
			isPermissionRole(collaborator.role) &&
			typeof collaborator.can_view === 'boolean' &&
			typeof collaborator.can_comment === 'boolean' &&
			typeof collaborator.can_edit === 'boolean' &&
			(collaborator.display_name == null ||
				typeof collaborator.display_name === 'string') &&
			(collaborator.full_name == null ||
				typeof collaborator.full_name === 'string') &&
			(collaborator.email == null || typeof collaborator.email === 'string') &&
			(collaborator.avatar_url == null ||
				typeof collaborator.avatar_url === 'string') &&
			typeof collaborator.is_anonymous === 'boolean' &&
			typeof collaborator.created_at === 'string' &&
			typeof collaborator.updated_at === 'string'
		);
	}

	if (value.type === 'sharing:collaborator:remove') {
		return (
			Array.isArray(value.removedShareIds) &&
			value.removedShareIds.length > 0 &&
			value.removedShareIds.every((shareId) => typeof shareId === 'string')
		);
	}

	return false;
}

export default class MindMapRealtimeServer implements Party.Server {
	private static projectionQueueByMap = new Map<string, Promise<void>>();

	constructor(readonly room: Party.Room) {}

	static async onBeforeConnect(
		request: Request,
		lobby: Party.Lobby,
		_ctx: Party.ExecutionContext
	): Promise<Response | Request> {
		return authorizeRoomRequest(request, lobby.env);
	}

	static async onBeforeRequest(
		request: Request,
		lobby: Party.Lobby,
		_ctx: Party.ExecutionContext
	): Promise<Response | Request> {
		const url = new URL(request.url);
		if (isAdminPath(url.pathname)) {
			const expectedToken = getEnvString(lobby.env, 'PARTYKIT_ADMIN_TOKEN')?.trim();
			const providedToken = readAdminToken(request)?.trim();

			if (!expectedToken) {
				return forbidden('Admin access denied');
			}

			if (!providedToken || !(await hmacEqual(providedToken, expectedToken))) {
				return forbidden('Admin access denied');
			}

			return request;
		}

		const roomName = parseRoomNameFromRequest(request);
		if (!roomName) {
			return request;
		}

		return authorizeRoomRequest(request, lobby.env);
	}

	getConnectionTags(
		_connection: Party.Connection,
		context: Party.ConnectionContext
	): string[] {
		const userId = context.request.headers.get('x-auth-user-id');
		const role = context.request.headers.get('x-auth-role');

		const tags: string[] = [];
		if (userId) tags.push(`user:${userId}`);
		if (role) tags.push(`role:${role}`);
		return tags;
	}

	async onConnect(
		connection: Party.Connection,
		context: Party.ConnectionContext
	): Promise<void> {
		const parsedRoom = parseMindMapRoom(this.room.id);
		if (!parsedRoom) {
			connection.close(1008, 'Invalid room');
			return;
		}

		const headerUserId = context.request.headers.get('x-auth-user-id');
		setConnectionState(connection, {
			userId: isUuid(headerUserId) ? headerUserId : null,
			mapId: parsedRoom.mapId,
			channel: parsedRoom.channel,
		});

		if (parsedRoom.channel === 'sharing') {
			const role = context.request.headers.get('x-auth-role');
			if (role !== 'owner') {
				connection.close(4403, 'owner_only');
				return;
			}

			try {
				const collaborators = await loadCollaboratorsSnapshotForMap(
					this.room.env,
					parsedRoom.mapId
				);
				const snapshotEvent: SharingCollaboratorsSnapshotEvent = {
					type: 'sharing:collaborators:snapshot',
					mapId: parsedRoom.mapId,
					occurredAt: new Date().toISOString(),
					collaborators,
				};
				connection.send(JSON.stringify(snapshotEvent));
				console.info('[partykit] Sharing snapshot sent', {
					mapId: parsedRoom.mapId,
					collaboratorCount: collaborators.length,
					roomName: parsedRoom.roomName,
				});
			} catch (error) {
				console.error('[partykit] Failed to build sharing snapshot', {
					mapId: parsedRoom.mapId,
					roomName: parsedRoom.roomName,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
				connection.close(1011, 'snapshot_failed');
			}
			return;
		}

		if (parsedRoom.channel === 'permissions') {
			const snapshot = this.buildPermissionSnapshot(
				parsedRoom.mapId,
				context.request.headers
			);
			if (!snapshot) {
				connection.close(1008, 'Invalid permission context');
				return;
			}
			connection.send(JSON.stringify(snapshot));
			return;
		}

		const canEdit = context.request.headers.get('x-auth-can-edit') === 'true';
		const allowDocWrites = parsedRoom.channel === 'sync' ? canEdit : true;

		await onYjsConnect(connection, this.room, {
			persist: {
				mode: 'snapshot',
			},
			readOnly: !allowDocWrites,
			load:
				parsedRoom.channel === 'sync'
					? async () => this.loadSyncDocFromDatabase(parsedRoom.mapId)
					: undefined,
			// Browser is the only DB/history writer in Yjs mode.
			// PartyKit remains transport + auth + awareness only.
			callback: undefined,
			});
	}

	async onRequest(request: Party.Request): Promise<Response> {
		const url = new URL(request.url);
		const isRevokeRequest = isAdminRevokePath(url.pathname);
		const isPermissionUpdateRequest = isAdminPermissionsUpdatePath(url.pathname);
		const isAccessRevokedRequest = isAdminAccessRevokedPath(url.pathname);
		const isCollaboratorEventRequest = isAdminCollaboratorEventPath(url.pathname);
		if (
			!isRevokeRequest &&
			!isPermissionUpdateRequest &&
			!isAccessRevokedRequest &&
			!isCollaboratorEventRequest
		) {
			return new Response('Not found', { status: 404 });
		}

		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		const roomResolution = resolveAdminRoom(request.url, this.room.id);
		const parsedRoom = roomResolution.parsedRoom;
		if (!parsedRoom) {
			console.warn('[partykit] Invalid admin room resolution', {
				pathname: url.pathname,
				roomSource: roomResolution.source,
				requestRoomName: roomResolution.requestRoomName,
				roomId: this.room.id,
			});
			return badRequest('Invalid room');
		}

		if (
			(isPermissionUpdateRequest || isAccessRevokedRequest) &&
			parsedRoom.channel !== 'permissions'
		) {
			console.warn(
				'[partykit] Permissions admin request rejected for non-permissions room',
				{
					pathname: url.pathname,
					mapId: parsedRoom.mapId,
					channel: parsedRoom.channel,
					roomName: parsedRoom.roomName,
				}
			);
			return badRequest('Invalid room');
		}

		if (isCollaboratorEventRequest && parsedRoom.channel !== 'sharing') {
			console.warn(
				'[partykit] Collaborator admin request rejected for non-sharing room',
				{
					pathname: url.pathname,
					mapId: parsedRoom.mapId,
					channel: parsedRoom.channel,
					roomName: parsedRoom.roomName,
				}
			);
			return badRequest('Invalid room');
		}

		let body: Record<string, unknown>;
		try {
			body = (await request.json()) as Record<string, unknown>;
		} catch {
			return badRequest('Invalid JSON body');
		}

		const mapId = typeof body.mapId === 'string' ? body.mapId : undefined;
		if (mapId && mapId !== parsedRoom.mapId) {
			return badRequest('Map ID does not match room');
		}

		if (isCollaboratorEventRequest) {
			if (!mapId) {
				return badRequest('mapId is required');
			}
			if (!isSharingAdminEventPayload(body)) {
				return badRequest('Invalid collaborator event payload');
			}

			const ownerId = await getMapOwnerId(this.room.env, mapId);
			if (!ownerId) {
				return badRequest('Map owner not found');
			}

			const targetConnections = listConnectionsForUser(this.room, ownerId);
			let deliveredConnections = 0;
			for (const connection of targetConnections) {
				connection.send(JSON.stringify(body));
				deliveredConnections += 1;
			}

			if (deliveredConnections === 0) {
				console.warn('[partykit] Collaborator admin event delivered to zero owner connections', {
					mapId,
					roomName: parsedRoom.roomName,
					eventType: body.type,
				});
			} else {
				console.info('[partykit] Collaborator admin event unicast delivered', {
					mapId,
					roomName: parsedRoom.roomName,
					eventType: body.type,
					ownerId,
					deliveredConnections,
				});
			}

			return Response.json({
				success: true,
				mapId,
				room: parsedRoom.roomName,
				ownerId,
				deliveredConnections,
			});
		}

		if (isRevokeRequest) {
			const bodyUserIds = Array.isArray(body.userIds) ? body.userIds : [];
			const userIds = Array.from(
				new Set(
					bodyUserIds
						.filter((value): value is string => typeof value === 'string')
						.map((value) => value.trim())
						.filter(Boolean)
				)
			);

			if (userIds.length === 0) {
				return badRequest('userIds is required');
			}

			// Validate all userIds are valid UUIDs
			for (const userId of userIds) {
				if (!UUID_PATTERN.test(userId)) {
					return badRequest('Invalid userId format');
				}
			}

			const rawReason =
				typeof body.reason === 'string' ? body.reason : 'access_revoked';
			const reason = rawReason.slice(0, 120);

			const closeResult = closeConnectionsForUsers(
				this.room,
				userIds,
				4403,
				reason
			);

			console.info('[partykit] Admin revoke disconnect applied', {
				mapId: parsedRoom.mapId,
				roomName: parsedRoom.roomName,
				requestedUsers: userIds.length,
				closedConnections: closeResult.closedConnections,
				fallbackClosedConnections: closeResult.fallbackClosedConnections,
			});

			return Response.json({
				success: true,
				mapId: parsedRoom.mapId,
				room: parsedRoom.roomName,
				requestedUsers: userIds.length,
				closedConnections: closeResult.closedConnections,
				fallbackClosedConnections: closeResult.fallbackClosedConnections,
			});
		}

		const targetUserId =
			typeof body.targetUserId === 'string' ? body.targetUserId : null;
		const role = body.role;
		const canView = body.can_view;
		const canComment = body.can_comment;
		const canEdit = body.can_edit;
		const updatedAt = typeof body.updatedAt === 'string' ? body.updatedAt : null;

		if (!mapId) {
			return badRequest('mapId is required');
		}
		if (!targetUserId || !UUID_PATTERN.test(targetUserId)) {
			return badRequest('Invalid targetUserId format');
		}

		if (isAccessRevokedRequest) {
			const reason = body.reason;
			const revokedAt =
				typeof body.revokedAt === 'string' ? body.revokedAt : null;
			if (reason !== 'access_revoked') {
				return badRequest('Invalid reason');
			}
			if (!revokedAt || Number.isNaN(Date.parse(revokedAt))) {
				return badRequest('Invalid revokedAt');
			}

			const event: PermissionRevokedEvent = {
				type: 'permissions:revoked',
				mapId,
				targetUserId,
				reason: 'access_revoked',
				revokedAt,
			};

			const targetConnections = listConnectionsForUser(this.room, targetUserId);
			let deliveredConnections = 0;
			for (const connection of targetConnections) {
				connection.send(JSON.stringify(event));
				deliveredConnections += 1;
			}

			if (deliveredConnections === 0) {
				console.warn('[partykit] Access revoked delivered to zero connections', {
					mapId,
					targetUserId,
					roomName: parsedRoom.roomName,
				});
			} else {
				console.info('[partykit] Access revoked unicast delivered', {
					mapId,
					targetUserId,
					deliveredConnections,
					roomName: parsedRoom.roomName,
				});
			}

			return Response.json({
				success: true,
				mapId: parsedRoom.mapId,
				room: parsedRoom.roomName,
				targetUserId,
				deliveredConnections,
			});
		}

		if (!isPermissionRole(role)) {
			return badRequest('Invalid role');
		}
		if (
			typeof canView !== 'boolean' ||
			typeof canComment !== 'boolean' ||
			typeof canEdit !== 'boolean'
		) {
			return badRequest('Permission flags must be boolean');
		}
		if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) {
			return badRequest('Invalid updatedAt');
		}

		const event: PermissionEvent = {
			type: 'permissions:update',
			mapId,
			targetUserId,
			role,
			can_view: canView,
			can_comment: canComment,
			can_edit: canEdit,
			updatedAt,
		};

		const targetConnections = listConnectionsForUser(this.room, targetUserId);
		let deliveredConnections = 0;
		for (const connection of targetConnections) {
			connection.send(JSON.stringify(event));
			deliveredConnections += 1;
		}

		if (deliveredConnections === 0) {
			console.warn('[partykit] Permission update delivered to zero connections', {
				mapId,
				targetUserId,
				roomName: parsedRoom.roomName,
			});
		} else {
			console.info('[partykit] Permission update unicast delivered', {
				mapId,
				targetUserId,
				deliveredConnections,
				roomName: parsedRoom.roomName,
			});
		}

		return Response.json({
			success: true,
			mapId: parsedRoom.mapId,
			room: parsedRoom.roomName,
			targetUserId,
			deliveredConnections,
		});
	}

	private buildPermissionSnapshot(
		mapId: string,
		headers: { get(name: string): string | null }
	): PermissionSnapshotEvent | null {
		const targetUserId = headers.get('x-auth-user-id');
		const role = headers.get('x-auth-role');
		if (!targetUserId || !UUID_PATTERN.test(targetUserId)) return null;
		if (!isPermissionRole(role)) return null;

		const canView = headers.get('x-auth-can-view') === 'true';
		const canComment = headers.get('x-auth-can-comment') === 'true';
		const canEdit = headers.get('x-auth-can-edit') === 'true';
		const updatedAt =
			headers.get('x-auth-permissions-updated-at') ?? new Date().toISOString();

		return {
			type: 'permissions:snapshot',
			mapId,
			targetUserId,
			role,
			can_view: canView,
			can_comment: canComment,
			can_edit: canEdit,
			updatedAt,
		};
	}

	private async loadSyncDocFromDatabase(mapId: string): Promise<Y.Doc> {
		const doc = new Y.Doc();
		const meta = doc.getMap<unknown>('meta');
		const nodesById = doc.getMap<Record<string, unknown>>('nodesById');
		const edgesById = doc.getMap<Record<string, unknown>>('edgesById');

		meta.set('schemaVersion', 1);
		meta.set('mapId', mapId);
		meta.set('stateAuthority', 'db_seeded');
		meta.set('loadedAt', new Date().toISOString());

		try {
			const graph = await loadMapGraph(this.room.env, mapId);
			const nodes = Array.isArray(graph?.nodes) ? graph?.nodes : [];
			const edges = Array.isArray(graph?.edges) ? graph?.edges : [];

			for (const node of nodes) {
				const record = toRecord(node);
				if (!record) continue;
				const id = typeof record?.id === 'string' ? record.id : null;
				if (!id) continue;
				nodesById.set(id, record);
			}

			for (const edge of edges) {
				const record = toRecord(edge);
				if (!record) continue;
				const id = typeof record?.id === 'string' ? record.id : null;
				if (!id) continue;
				edgesById.set(id, record);
			}
		} catch (error) {
			// Non-fatal: collaboration can continue from an empty document.
			console.error('[partykit] Failed to seed Y.Doc from DB:', error);
		}

		return doc;
	}

	private async enqueueProjection(mapId: string, doc: Y.Doc): Promise<void> {
		const encodedDoc = Y.encodeStateAsUpdate(doc);
		const previous =
			MindMapRealtimeServer.projectionQueueByMap.get(mapId) ??
			Promise.resolve();

		const next = previous
			.catch(() => undefined)
			.then(async () => {
				const snapshot = new Y.Doc();
				try {
					Y.applyUpdate(snapshot, encodedDoc);
					await this.projectSyncDocToDatabase(mapId, snapshot);
				} finally {
					snapshot.destroy();
				}
			});

		MindMapRealtimeServer.projectionQueueByMap.set(mapId, next);
		try {
			await next;
		} finally {
			if (MindMapRealtimeServer.projectionQueueByMap.get(mapId) === next) {
				MindMapRealtimeServer.projectionQueueByMap.delete(mapId);
			}
		}
	}

	private async upsertBatched(
		table: 'nodes' | 'edges',
		rows: Array<Record<string, unknown>>
	): Promise<void> {
		for (const batch of chunkArray(rows, UPSERT_BATCH_SIZE)) {
			await upsertSupabaseRows(this.room.env, table, batch);
		}
	}

	private async ensureBaselineSnapshot(
		mapId: string,
		actorId: string,
		stateBeforeChange: GraphSnapshot
	): Promise<{ id: string; snapshotIndex: number } | null> {
		const existingSnapshots = await querySupabaseRows<{
			id: string;
			snapshot_index: number;
		}>(this.room.env, 'map_history_snapshots', {
			select: 'id,snapshot_index',
			map_id: `eq.${mapId}`,
			order: 'snapshot_index.desc',
			limit: '1',
		});

		const latestSnapshot = existingSnapshots[0];
		if (latestSnapshot?.id) {
			return {
				id: latestSnapshot.id,
				snapshotIndex: latestSnapshot.snapshot_index,
			};
		}

		const insertedSnapshots = await insertSupabaseRows<{ id: string }>(
			this.room.env,
			'map_history_snapshots',
			[
				{
					map_id: mapId,
					user_id: actorId,
					snapshot_index: 0,
					action_name: 'baseline',
					nodes: stateBeforeChange.nodes,
					edges: stateBeforeChange.edges,
					node_count: stateBeforeChange.nodes.length,
					edge_count: stateBeforeChange.edges.length,
					is_major: false,
				},
			]
		);

		const insertedSnapshotId = insertedSnapshots[0]?.id;
		if (!insertedSnapshotId) return null;

		return {
			id: insertedSnapshotId,
			snapshotIndex: 0,
		};
	}

	private async persistHistoryForProjection(
		mapId: string,
		previousGraph: GraphSnapshot,
		nextGraph: GraphSnapshot,
		projectionMeta: GraphProjectionMeta
	): Promise<void> {
		const delta = calculateHistoryDelta(previousGraph, nextGraph);
		if (!delta) return;

		let actorId: string | null =
			projectionMeta.lastMutationBy ?? extractActorIdFromDelta(delta);
		if (!isUuid(actorId)) {
			actorId = await getMapOwnerId(this.room.env, mapId);
		}
		if (!isUuid(actorId)) {
			console.warn(
				`[partykit] Skipping history write for map ${mapId}: missing actor id`
			);
			return;
		}

		const baseline = await this.ensureBaselineSnapshot(
			mapId,
			actorId,
			previousGraph
		);
		if (!baseline?.id) return;

		const latestEvent = await querySupabaseRows<{ event_index: number }>(
			this.room.env,
			'map_history_events',
			{
				select: 'event_index',
				snapshot_id: `eq.${baseline.id}`,
				order: 'event_index.desc',
				limit: '1',
			}
		);
		const nextEventIndex = (latestEvent[0]?.event_index ?? -1) + 1;
		const actionName = inferActionName(delta, projectionMeta.lastMutationEvent);

		const insertedEvents = await insertSupabaseRows<{
			id: string;
			snapshot_id: string;
		}>(this.room.env, 'map_history_events', [
			{
				map_id: mapId,
				user_id: actorId,
				snapshot_id: baseline.id,
				event_index: nextEventIndex,
				action_name: actionName,
				operation_type: delta.operation,
				entity_type: delta.entityType,
				changes: delta,
			},
		]);

		const insertedEvent = insertedEvents[0];
		if (!insertedEvent?.id) return;

		await upsertSupabaseRows(
			this.room.env,
			'map_history_current',
			[
				{
					map_id: mapId,
					snapshot_id: insertedEvent.snapshot_id,
					event_id: insertedEvent.id,
					updated_by: actorId,
					updated_at: new Date().toISOString(),
				},
			],
			'map_id'
		);
	}

	private async projectSyncDocToDatabase(
		mapId: string,
		doc: Y.Doc
	): Promise<void> {
		const meta = doc.getMap<unknown>('meta');
		const stateAuthority = meta.get('stateAuthority');
		// Projection is intentionally gated until the app migrates node/edge state
		// writes to nodesById/edgesById as the primary collaboration model.
		if (stateAuthority !== 'yjs_primary') {
			return;
		}

		const nodesById = doc.getMap<unknown>('nodesById');
		const edgesById = doc.getMap<unknown>('edgesById');
		const projectionMeta = readProjectionMeta(meta);

		const nodeRows: NodeRow[] = [];
		const nextNodeIds = new Set<string>();
		for (const [id, value] of nodesById.entries()) {
			const normalized = normalizeNodeRecord(mapId, id, value);
			if (!normalized) continue;
			const normalizedNode = normalizeNodeRow(normalized);
			if (!normalizedNode) continue;
			nodeRows.push(normalizedNode);
			nextNodeIds.add(normalizedNode.id);
		}

		const edgeRows: EdgeRow[] = [];
		const nextEdgeIds = new Set<string>();
		for (const [id, value] of edgesById.entries()) {
			const normalized = normalizeEdgeRecord(mapId, id, value);
			if (!normalized) continue;
			const normalizedEdge = normalizeEdgeRow(normalized);
			if (!normalizedEdge) continue;
			edgeRows.push(normalizedEdge);
			nextEdgeIds.add(normalizedEdge.id);
		}

		try {
			const existingGraph = await loadMapRows(this.room.env, mapId);
			const existingNodeById = new Map(
				existingGraph.nodes.map((row) => [row.id, row])
			);
			const existingEdgeById = new Map(
				existingGraph.edges.map((row) => [row.id, row])
			);

			const staleNodeIds = existingGraph.nodes
				.map((row) => row.id)
				.filter((id) => !nextNodeIds.has(id));
			const staleEdgeIds = existingGraph.edges
				.map((row) => row.id)
				.filter((id) => !nextEdgeIds.has(id));
			const stableNodeRows = nodeRows.map((row) => {
				const existing = existingNodeById.get(row.id);
				if (!existing) return row;
				return {
					...row,
					user_id: existing.user_id ?? row.user_id,
					created_at: existing.created_at ?? row.created_at,
				};
			});
			const stableEdgeRows = edgeRows.map((row) => {
				const existing = existingEdgeById.get(row.id);
				if (!existing) return row;
				return {
					...row,
					user_id: existing.user_id ?? row.user_id,
					created_at: existing.created_at ?? row.created_at,
				};
			});
			const nodesToUpsert = stableNodeRows.filter((row) => {
				const existing = existingNodeById.get(row.id);
				if (!existing) return true;
				return !areNodeRowsEquivalentForProjection(existing, row);
			});
			const edgesToUpsert = stableEdgeRows.filter((row) => {
				const existing = existingEdgeById.get(row.id);
				if (!existing) return true;
				return !areEdgeRowsEquivalentForProjection(existing, row);
			});

			await this.upsertBatched(
				'nodes',
				nodesToUpsert as unknown as Array<Record<string, unknown>>
			);
			await this.upsertBatched(
				'edges',
				edgesToUpsert as unknown as Array<Record<string, unknown>>
			);
			await deleteSupabaseRowsByIds(this.room.env, 'edges', mapId, staleEdgeIds);
			await deleteSupabaseRowsByIds(this.room.env, 'nodes', mapId, staleNodeIds);

			if (!projectionMeta.skipHistoryOnce) {
				const previousSnapshot = buildGraphSnapshot(
					existingGraph.nodes,
					existingGraph.edges
				);
				const nextSnapshot = buildGraphSnapshot(stableNodeRows, stableEdgeRows);
				try {
					await this.persistHistoryForProjection(
						mapId,
						previousSnapshot,
						nextSnapshot,
						projectionMeta
					);
				} catch (historyError) {
					console.error(
						'[partykit] Failed to persist history from projection:',
						historyError
					);
				}
			}
		} catch (error) {
			console.error('[partykit] Failed to project Y.Doc to DB:', error);
		}
	}
}
