import {
	isAdminAccessRevokedPath,
	isAdminCollaboratorEventPath,
	isAdminPermissionsUpdatePath,
	isAdminRevokePath,
	parseMindMapRoom,
	parseRoomNameFromRequest,
	readAdminToken,
	readAuthToken,
} from '../../../partykit/auth';

function createMockRequest(
	url: string,
	headers: Record<string, string> = {}
): Request {
	const lowerCaseHeaders = new Map(
		Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
	);

	return {
		url,
		headers: {
			get: (name: string) => lowerCaseHeaders.get(name.toLowerCase()) ?? null,
		},
	} as unknown as Request;
}

describe('partykit auth helpers', () => {
	const mapId = '11111111-2222-3333-4444-555555555555';
	const roomName = `mind-map:${mapId}:sync`;

	describe('parseMindMapRoom', () => {
		it('parses canonical room names', () => {
			expect(parseMindMapRoom(roomName)).toEqual({
				roomName,
				mapId,
				channel: 'sync',
			});
		});

		it('defaults channel to sync when missing', () => {
			expect(parseMindMapRoom(`mind-map:${mapId}`)).toEqual({
				roomName: `mind-map:${mapId}`,
				mapId,
				channel: 'sync',
			});
		});

		it('accepts room names with path prefixes', () => {
			expect(parseMindMapRoom(`main/${roomName}`)).toEqual({
				roomName,
				mapId,
				channel: 'sync',
			});
		});

		it('accepts encoded room names', () => {
			expect(parseMindMapRoom(encodeURIComponent(roomName))).toEqual({
				roomName,
				mapId,
				channel: 'sync',
			});
		});

		it('rejects invalid room names', () => {
			expect(parseMindMapRoom('mind-map:not-a-uuid:sync')).toBeNull();
			expect(parseMindMapRoom('presence:map:123')).toBeNull();
		});
	});

	describe('parseRoomNameFromRequest', () => {
		it('parses parties route room names', () => {
			expect(
				parseRoomNameFromRequest(
					`https://example.com/parties/main/${encodeURIComponent(roomName)}`
				)
			).toBe(roomName);
		});

		it('parses party route room names with party name', () => {
			expect(
				parseRoomNameFromRequest(
					`https://example.com/party/main/${encodeURIComponent(roomName)}`
				)
			).toBe(roomName);
		});

		it('ignores admin endpoints for room extraction', () => {
			expect(parseRoomNameFromRequest('https://example.com/party/main/admin/revoke')).toBe(
				'main'
			);
		});
	});

	describe('token readers', () => {
		it('reads bearer auth token from authorization header first', () => {
			const request = createMockRequest(`https://example.com/party/${roomName}`, {
				Authorization: 'Bearer token-from-header',
			});
			expect(readAuthToken(request)).toBe('token-from-header');
		});

		it('reads auth token from query when header is absent', () => {
			const request = createMockRequest(
				`https://example.com/party/${roomName}?token=token-from-query`
			);
			expect(readAuthToken(request)).toBe('token-from-query');
		});

		it('reads admin token from authorization or fallback header', () => {
			const authHeaderRequest = createMockRequest(
				'https://example.com/party/main/admin/revoke',
				{ Authorization: 'Bearer admin-token' }
			);
			expect(readAdminToken(authHeaderRequest)).toBe('admin-token');

			const fallbackHeaderRequest = createMockRequest(
				'https://example.com/party/main/admin/revoke',
				{ 'X-PartyKit-Admin-Token': 'fallback-token' }
			);
			expect(readAdminToken(fallbackHeaderRequest)).toBe('fallback-token');
		});
	});

	describe('admin path detection', () => {
		it('matches only /admin/revoke paths', () => {
			expect(isAdminRevokePath('/party/main/admin/revoke')).toBe(true);
			expect(isAdminRevokePath('/parties/main/room/admin/revoke')).toBe(true);
			expect(isAdminRevokePath('/party/main')).toBe(false);
		});

		it('matches only /admin/permissions-update paths', () => {
			expect(
				isAdminPermissionsUpdatePath('/party/main/admin/permissions-update')
			).toBe(true);
			expect(
				isAdminPermissionsUpdatePath(
					'/parties/main/mind-map%3Aabc%3Apermissions/admin/permissions-update'
				)
			).toBe(true);
			expect(isAdminPermissionsUpdatePath('/party/main/admin/revoke')).toBe(
				false
			);
		});

		it('matches only /admin/access-revoked paths', () => {
			expect(isAdminAccessRevokedPath('/party/main/admin/access-revoked')).toBe(
				true
			);
			expect(
				isAdminAccessRevokedPath(
					'/parties/main/mind-map%3Aabc%3Apermissions/admin/access-revoked'
				)
			).toBe(true);
			expect(
				isAdminAccessRevokedPath('/party/main/admin/permissions-update')
			).toBe(false);
		});

		it('matches only /admin/collaborator-event paths', () => {
			expect(
				isAdminCollaboratorEventPath('/party/main/admin/collaborator-event')
			).toBe(true);
			expect(
				isAdminCollaboratorEventPath(
					'/parties/main/mind-map%3Aabc%3Asharing/admin/collaborator-event'
				)
			).toBe(true);
			expect(
				isAdminCollaboratorEventPath('/party/main/admin/access-revoked')
			).toBe(false);
		});
	});
});
