import { getMindMapRoomName } from '@/lib/realtime/room-names';
import {
	disconnectPartyKitUsers,
	pushPartyKitAccessRevoked,
	pushPartyKitPermissionUpdate,
} from './admin';

const mapId = '11111111-2222-3333-4444-555555555555';
const targetUserId = 'aaaaaaaa-1111-4111-8111-111111111111';

describe('partykit admin helper', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetAllMocks();
		process.env = {
			...originalEnv,
			PARTYKIT_BASE_URL: 'https://partykit.example.com',
			PARTYKIT_ADMIN_TOKEN: 'secret',
			PARTYKIT_PARTY_NAME: 'main',
		};
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	function mockResponse(status: number, body: string) {
		return {
			ok: status >= 200 && status < 300,
			status,
			text: async () => body,
		} as Response;
	}

	it('tries encoded and raw permission room endpoints before succeeding', async () => {
		const roomName = getMindMapRoomName(mapId, 'permissions');
		const encodedRoomName = encodeURIComponent(roomName);
		const rawRoomFragment = `/parties/main/${roomName}/admin/permissions-update`;

		const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes(rawRoomFragment)) {
				return mockResponse(200, '');
			}
			return mockResponse(400, 'Invalid room');
		});
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as never;

		const result = await pushPartyKitPermissionUpdate({
			mapId,
			targetUserId,
			role: 'viewer',
			can_view: true,
			can_comment: false,
			can_edit: false,
			updatedAt: '2026-02-23T14:00:00.000Z',
		});

		expect(result).toEqual({ attempted: true, delivered: true });
		expect(
			fetchMock.mock.calls.some(([request]) =>
				String(request).includes(`/${encodedRoomName}/admin/permissions-update`)
			)
		).toBe(true);
		expect(
			fetchMock.mock.calls.some(([request]) =>
				String(request).includes(`/${roomName}/admin/permissions-update`)
			)
		).toBe(true);
	});

	it('pushes access revoked to encoded or raw permissions room endpoint', async () => {
		const roomName = getMindMapRoomName(mapId, 'permissions');
		const encodedRoomName = encodeURIComponent(roomName);
		const rawRoomFragment = `/parties/main/${roomName}/admin/access-revoked`;

		const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes(rawRoomFragment)) {
				return mockResponse(200, '');
			}
			return mockResponse(400, 'Invalid room');
		});
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as never;

		const result = await pushPartyKitAccessRevoked({
			mapId,
			targetUserId,
			reason: 'access_revoked',
			revokedAt: '2026-02-23T14:00:00.000Z',
		});

		expect(result).toEqual({ attempted: true, delivered: true });
		expect(
			fetchMock.mock.calls.some(([request]) =>
				String(request).includes(`/${encodedRoomName}/admin/access-revoked`)
			)
		).toBe(true);
		expect(
			fetchMock.mock.calls.some(([request]) =>
				String(request).includes(`/${roomName}/admin/access-revoked`)
			)
		).toBe(true);
	});

	it('includes permissions room in disconnect set for access_revoked', async () => {
		const fetchMock = jest
			.fn()
			.mockResolvedValue(mockResponse(200, 'ok')) as jest.Mock;
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as never;

		const result = await disconnectPartyKitUsers({
			mapId,
			userIds: [targetUserId],
			reason: 'access_revoked',
		});

		expect(result.attempted).toBe(true);
		expect(
			fetchMock.mock.calls.some(([request]) =>
				String(request).includes(
					`/${encodeURIComponent(getMindMapRoomName(mapId, 'permissions'))}/admin/revoke`
				)
			)
		).toBe(true);
	});

	it('returns delivered=false when every endpoint responds 404', async () => {
		(globalThis as { fetch: typeof fetch }).fetch = jest
			.fn()
			.mockResolvedValue(mockResponse(404, 'Not found')) as never;

		const result = await pushPartyKitPermissionUpdate({
			mapId,
			targetUserId,
			role: 'viewer',
			can_view: true,
			can_comment: false,
			can_edit: false,
			updatedAt: '2026-02-23T14:00:00.000Z',
		});

		expect(result).toEqual({ attempted: true, delivered: false });
	});

	it('continues fallback when an endpoint throws network error', async () => {
		const roomName = getMindMapRoomName(mapId, 'permissions');
		const encodedRoomName = encodeURIComponent(roomName);
		const rawRoomFragment = `/parties/main/${roomName}/admin/permissions-update`;

		const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes(`/${encodedRoomName}/admin/permissions-update`)) {
				throw new Error('Simulated network failure');
			}
			if (url.includes(rawRoomFragment)) {
				return mockResponse(200, 'ok');
			}
			return mockResponse(404, 'Not found');
		});
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as never;

		const result = await pushPartyKitPermissionUpdate({
			mapId,
			targetUserId,
			role: 'viewer',
			can_view: true,
			can_comment: false,
			can_edit: false,
			updatedAt: '2026-02-23T14:00:00.000Z',
		});

		expect(result).toEqual({ attempted: true, delivered: true });
		expect(fetchMock).toHaveBeenCalled();
		expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
	});
});
