import {
	getMindMapRoomName,
	type MindMapRealtimeChannel,
} from '@/lib/realtime/room-names';

export type PartyKitDisconnectPayload = {
	mapId: string;
	userIds: string[];
	reason: 'access_revoked';
};

export type PartyKitDisconnectResult = {
	attempted: boolean;
	succeededRooms: string[];
	failedRooms: string[];
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
	roomName: string
): string[] {
	const encodedRoomName = encodeURIComponent(roomName);
	return [
		`${baseUrl}/parties/${partyName}/${encodedRoomName}/admin/revoke`,
		`${baseUrl}/party/${encodedRoomName}/admin/revoke`,
		`${baseUrl}/party/${partyName}/${encodedRoomName}/admin/revoke`,
	];
}

async function postToFirstWorkingEndpoint(
	endpoints: string[],
	adminToken: string,
	payload: PartyKitDisconnectPayload
): Promise<boolean> {
	let lastError: Error | null = null;

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

			if (response.status === 404) {
				continue;
			}

			const errorText = await response.text();
			lastError = new Error(
				`PartyKit admin call failed (${response.status}): ${errorText}`
			);
			break;
		} catch (error) {
			lastError =
				error instanceof Error
					? error
					: new Error('Unknown PartyKit admin request failure');
		}
	}

	if (lastError) {
		throw lastError;
	}

	return false;
}

export async function disconnectPartyKitUsers(
	payload: PartyKitDisconnectPayload
): Promise<PartyKitDisconnectResult> {
	const baseUrl = process.env.PARTYKIT_BASE_URL?.trim();
	const adminToken = process.env.PARTYKIT_ADMIN_TOKEN?.trim();
	const partyName = process.env.PARTYKIT_PARTY_NAME?.trim() || 'main';

	const userIds = Array.from(
		new Set(payload.userIds.map((id) => id.trim()).filter(Boolean))
	);

	if (!baseUrl || !adminToken || userIds.length === 0) {
		return {
			attempted: false,
			succeededRooms: [],
			failedRooms: [],
		};
	}

	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	const roomNames = DEFAULT_ROOM_SUFFIXES.map(
		(suffix) => getMindMapRoomName(payload.mapId, suffix)
	);

	const succeededRooms: string[] = [];
	const failedRooms: string[] = [];

	for (const roomName of roomNames) {
		const endpoints = buildAdminEndpoints(
			normalizedBaseUrl,
			partyName,
			roomName
		);
		try {
			const ok = await postToFirstWorkingEndpoint(endpoints, adminToken, {
				...payload,
				userIds,
			});
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
