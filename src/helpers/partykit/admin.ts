import {
	getMindMapRoomName,
	type MindMapRealtimeChannel,
} from '@/lib/realtime/room-names';
import type {
	CollaboratorAdminEventPayload,
} from '@/lib/realtime/collaborator-events';
import type { ShareRole } from '@/types/sharing-types';

export type PartyKitDisconnectPayload = {
	mapId: string;
	userIds: string[];
	reason: 'access_revoked' | 'permissions_updated';
};

export type PartyKitDisconnectResult = {
	attempted: boolean;
	succeededRooms: string[];
	failedRooms: string[];
};

export type PartyKitPermissionUpdatePayload = {
	mapId: string;
	targetUserId: string;
	role: ShareRole;
	can_view: boolean;
	can_comment: boolean;
	can_edit: boolean;
	updatedAt: string;
};

export type PartyKitPermissionUpdateResult = {
	attempted: boolean;
	delivered: boolean;
};

export type PartyKitAccessRevokedPayload = {
	mapId: string;
	targetUserId: string;
	reason: 'access_revoked';
	revokedAt: string;
};

export type PartyKitAccessRevokedResult = {
	attempted: boolean;
	delivered: boolean;
};

export type PartyKitCollaboratorEventResult = {
	attempted: boolean;
	delivered: boolean;
};

const DEFAULT_ROOM_SUFFIXES: ReadonlyArray<MindMapRealtimeChannel> = [
	'sync',
	'cursor',
	'presence',
	'selected-nodes',
];

function normalizeBaseUrl(input: string): string {
	return input.replace(/\/+$/, '');
}

function buildAdminEndpoints(
	baseUrl: string,
	partyName: string,
	roomName: string,
	adminPath:
		| 'revoke'
		| 'permissions-update'
		| 'access-revoked'
		| 'collaborator-event'
): string[] {
	const roomVariants = Array.from(
		new Set([encodeURIComponent(roomName), roomName])
	);
	const endpoints = roomVariants.flatMap((roomSegment) => [
		`${baseUrl}/parties/${partyName}/${roomSegment}/admin/${adminPath}`,
		`${baseUrl}/party/${roomSegment}/admin/${adminPath}`,
		`${baseUrl}/party/${partyName}/${roomSegment}/admin/${adminPath}`,
	]);

	return Array.from(new Set(endpoints));
}

async function postToFirstWorkingEndpoint<TPayload>(
	endpoints: string[],
	adminToken: string,
	payload: TPayload
): Promise<boolean> {
	let fatalError: Error | null = null;

	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${adminToken}`,
					'X-PartyKit-Admin-Token': adminToken,
				},
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				return true;
			}

			const errorText = await response.text();

			if (response.status === 404 || response.status === 400) {
				continue;
			}

			fatalError = new Error(
				`PartyKit admin call failed (${response.status}): ${errorText}`
			);
			continue;
		} catch (error) {
			fatalError =
				error instanceof Error
					? error
					: new Error('Unknown PartyKit admin request failure');
			continue;
		}
	}

	if (fatalError) {
		throw fatalError;
	}

	return false;
}

function getAdminConfig(): {
	baseUrl: string;
	adminToken: string;
	partyName: string;
} | null {
	const baseUrl = process.env.PARTYKIT_BASE_URL?.trim();
	const adminToken = process.env.PARTYKIT_ADMIN_TOKEN?.trim();
	const partyName = process.env.PARTYKIT_PARTY_NAME?.trim() || 'main';

	if (!baseUrl || !adminToken) {
		return null;
	}

	return {
		baseUrl: normalizeBaseUrl(baseUrl),
		adminToken,
		partyName,
	};
}

export async function disconnectPartyKitUsers(
	payload: PartyKitDisconnectPayload
): Promise<PartyKitDisconnectResult> {
	const config = getAdminConfig();

	const userIds = Array.from(
		new Set(payload.userIds.map((id) => id.trim()).filter(Boolean))
	);

	if (!config || userIds.length === 0) {
		return {
			attempted: false,
			succeededRooms: [],
			failedRooms: [],
		};
	}

	const roomNames = DEFAULT_ROOM_SUFFIXES.map((suffix) =>
		getMindMapRoomName(payload.mapId, suffix)
	);
	const disconnectRoomNames =
		payload.reason === 'access_revoked'
			? [...roomNames, getMindMapRoomName(payload.mapId, 'permissions')]
			: roomNames;

	const succeededRooms: string[] = [];
	const failedRooms: string[] = [];

	for (const roomName of disconnectRoomNames) {
		const endpoints = buildAdminEndpoints(
			config.baseUrl,
			config.partyName,
			roomName,
			'revoke'
		);
		try {
			const ok = await postToFirstWorkingEndpoint(
				endpoints,
				config.adminToken,
				{
					...payload,
					userIds,
				}
			);
			if (ok) {
				succeededRooms.push(roomName);
			} else {
				failedRooms.push(roomName);
			}
		} catch {
			failedRooms.push(roomName);
		}
	}

	return {
		attempted: true,
		succeededRooms,
		failedRooms,
	};
}

export async function pushPartyKitPermissionUpdate(
	payload: PartyKitPermissionUpdatePayload
): Promise<PartyKitPermissionUpdateResult> {
	const config = getAdminConfig();
	if (!config || !payload.mapId || !payload.targetUserId) {
		return {
			attempted: false,
			delivered: false,
		};
	}

	const roomName = getMindMapRoomName(payload.mapId, 'permissions');
	const endpoints = buildAdminEndpoints(
		config.baseUrl,
		config.partyName,
		roomName,
		'permissions-update'
	);

	const delivered = await postToFirstWorkingEndpoint(
		endpoints,
		config.adminToken,
		payload
	);

	return {
		attempted: true,
		delivered,
	};
}

export async function pushPartyKitAccessRevoked(
	payload: PartyKitAccessRevokedPayload
): Promise<PartyKitAccessRevokedResult> {
	const config = getAdminConfig();
	if (!config || !payload.mapId || !payload.targetUserId) {
		return {
			attempted: false,
			delivered: false,
		};
	}

	const roomName = getMindMapRoomName(payload.mapId, 'permissions');
	const endpoints = buildAdminEndpoints(
		config.baseUrl,
		config.partyName,
		roomName,
		'access-revoked'
	);

	const delivered = await postToFirstWorkingEndpoint(
		endpoints,
		config.adminToken,
		payload
	);

	return {
		attempted: true,
		delivered,
	};
}

export async function pushPartyKitCollaboratorEvent(
	payload: CollaboratorAdminEventPayload
): Promise<PartyKitCollaboratorEventResult> {
	const config = getAdminConfig();
	if (!config || !payload.mapId) {
		return {
			attempted: false,
			delivered: false,
		};
	}

	const roomName = getMindMapRoomName(payload.mapId, 'sharing');
	const endpoints = buildAdminEndpoints(
		config.baseUrl,
		config.partyName,
		roomName,
		'collaborator-event'
	);

	const delivered = await postToFirstWorkingEndpoint(
		endpoints,
		config.adminToken,
		payload
	);

	return {
		attempted: true,
		delivered,
	};
}
