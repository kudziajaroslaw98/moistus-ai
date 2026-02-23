import type { PermissionSnapshotOrUpdateEvent } from '@/store/app-state';

jest.mock('@/helpers/supabase/shared-client', () => ({
	getSharedSupabaseClient: () => ({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
			getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
		},
	}),
}));

jest.mock('@/lib/realtime/permission-channel', () => ({
	subscribeToPermissionChannel: jest.fn(),
}));

const reconnectYjsRoomsForMap = jest.fn();
jest.mock('@/lib/realtime/yjs-provider', () => ({
	reconnectYjsRoomsForMap: (...args: unknown[]) =>
		reconnectYjsRoomsForMap(...args),
}));

function createPermissionsSliceHarness() {
	const { createPermissionsSlice } =
		require('@/store/slices/permissions-slice') as typeof import('@/store/slices/permissions-slice');

	const unsubscribeFromRealtimeUpdates = jest.fn().mockResolvedValue(undefined);
	let state: Record<string, unknown> = {
		currentUser: { id: 'user-1' },
		authUser: { is_anonymous: false },
		mapAccessError: null,
		unsubscribeFromRealtimeUpdates,
		setMapAccessError: (error: unknown) => {
			state = { ...state, mapAccessError: error };
		},
	};

	const set = (partial: unknown) => {
		const patch =
			typeof partial === 'function'
				? (
						partial as (
							current: Record<string, unknown>
						) => Record<string, unknown>
					)(state)
				: (partial as Record<string, unknown>);
		state = { ...state, ...(patch ?? {}) };
	};

	const get = () => state;
	const slice = createPermissionsSlice(set as never, get as never, {} as never);
	state = {
		...state,
		...slice,
		permissionsMapId: 'map-1',
		permissionsUserId: 'user-1',
	};

	return {
		getState: () => state,
		fetchInitialPermissions: slice.fetchInitialPermissions,
		applyPermissionEvent: slice.applyPermissionEvent,
		unsubscribeFromRealtimeUpdates,
	};
}

function mockFetchResponse(body: unknown, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as Response;
}

function buildEvent(
	overrides: Partial<PermissionSnapshotOrUpdateEvent> = {}
): PermissionSnapshotOrUpdateEvent {
	return {
		type: 'permissions:update',
		mapId: 'map-1',
		targetUserId: 'user-1',
		role: 'viewer',
		can_view: true,
		can_comment: false,
		can_edit: false,
		updatedAt: '2026-02-23T10:00:00.000Z',
		...overrides,
	};
}

describe('permissions slice', () => {
	beforeEach(() => {
		reconnectYjsRoomsForMap.mockReset();
	});

	it('ignores stale initial permission fetch responses after map switch', async () => {
		const harness = createPermissionsSliceHarness();
		const originalFetch = globalThis.fetch;
		let resolveMap1Request: (value: Response) => void = () => {};
		const map1Request = new Promise<Response>((resolve) => {
			resolveMap1Request = resolve;
		});

		(globalThis as { fetch: typeof fetch }).fetch = jest.fn(
			(input: RequestInfo | URL) => {
				const url = String(input);
				if (url.includes('/api/maps/map-1/permissions')) {
					return map1Request;
				}

				if (url.includes('/api/maps/map-2/permissions')) {
					return Promise.resolve(
						mockFetchResponse({
							data: {
								role: 'editor',
								can_view: true,
								can_comment: true,
								can_edit: true,
								updated_at: '2026-02-24T10:10:00.000Z',
							},
						})
					);
				}

				return Promise.resolve(mockFetchResponse({}, 404));
			}
		) as unknown as typeof fetch;

		try {
			const firstFetch = harness.fetchInitialPermissions('map-1');
			await Promise.resolve();
			const secondFetch = harness.fetchInitialPermissions('map-2');

			resolveMap1Request(
				mockFetchResponse({
					data: {
						role: 'viewer',
						can_view: true,
						can_comment: false,
						can_edit: false,
						updated_at: '2026-02-24T10:00:00.000Z',
					},
				})
			);

			await Promise.all([firstFetch, secondFetch]);

			expect(harness.getState().permissionsMapId).toBe('map-2');
			expect(harness.getState().permissions).toMatchObject({
				role: 'editor',
				can_view: true,
				can_comment: true,
				can_edit: true,
				updated_at: '2026-02-24T10:10:00.000Z',
			});
		} finally {
			(globalThis as { fetch: typeof fetch }).fetch = originalFetch;
		}
	});

	it('applies snapshot and update events in order', () => {
		const harness = createPermissionsSliceHarness();
		const apply = harness.applyPermissionEvent;

		apply(
			buildEvent({
				type: 'permissions:snapshot',
				role: 'viewer',
				can_comment: false,
				can_edit: false,
				updatedAt: '2026-02-23T10:00:00.000Z',
			})
		);
		expect(harness.getState().permissions).toMatchObject({
			role: 'viewer',
			can_view: true,
			can_comment: false,
			can_edit: false,
			updated_at: '2026-02-23T10:00:00.000Z',
		});

		apply(
			buildEvent({
				type: 'permissions:update',
				role: 'editor',
				can_comment: true,
				can_edit: true,
				updatedAt: '2026-02-23T10:05:00.000Z',
			})
		);
		expect(harness.getState().permissions).toMatchObject({
			role: 'editor',
			can_view: true,
			can_comment: true,
			can_edit: true,
			updated_at: '2026-02-23T10:05:00.000Z',
		});
	});

	it('rejects events for another map or another user', () => {
		const harness = createPermissionsSliceHarness();
		const apply = harness.applyPermissionEvent;

		apply(buildEvent({ updatedAt: '2026-02-23T10:05:00.000Z' }));
		const baseline = harness.getState().permissions;

		apply(
			buildEvent({
				mapId: 'map-2',
				role: 'editor',
				can_edit: true,
				can_comment: true,
				updatedAt: '2026-02-23T10:10:00.000Z',
			})
		);
		expect(harness.getState().permissions).toEqual(baseline);

		apply(
			buildEvent({
				targetUserId: 'user-2',
				role: 'commentator',
				can_edit: false,
				can_comment: true,
				updatedAt: '2026-02-23T10:11:00.000Z',
			})
		);
		expect(harness.getState().permissions).toEqual(baseline);
	});

	it('rejects stale updates based on updatedAt version', () => {
		const harness = createPermissionsSliceHarness();
		const apply = harness.applyPermissionEvent;

		apply(
			buildEvent({
				role: 'editor',
				can_edit: true,
				can_comment: true,
				updatedAt: '2026-02-23T10:20:00.000Z',
			})
		);
		const latest = harness.getState().permissions;

		apply(
			buildEvent({
				role: 'viewer',
				can_edit: false,
				can_comment: false,
				updatedAt: '2026-02-23T10:19:59.000Z',
			})
		);
		expect(harness.getState().permissions).toEqual(latest);
	});

	it('reconnects Yjs rooms when can_edit flips', () => {
		const harness = createPermissionsSliceHarness();
		const apply = harness.applyPermissionEvent;

		apply(
			buildEvent({
				role: 'viewer',
				can_edit: false,
				can_comment: false,
				updatedAt: '2026-02-23T10:00:00.000Z',
			})
		);
		expect(reconnectYjsRoomsForMap).not.toHaveBeenCalled();

		apply(
			buildEvent({
				role: 'editor',
				can_edit: true,
				can_comment: true,
				updatedAt: '2026-02-23T10:05:00.000Z',
			})
		);
		expect(reconnectYjsRoomsForMap).toHaveBeenCalledWith('map-1');
	});

	it('applies revoked events for current user/map and triggers kick state', () => {
		const harness = createPermissionsSliceHarness();

		harness.applyPermissionEvent({
			type: 'permissions:revoked',
			mapId: 'map-1',
			targetUserId: 'user-1',
			reason: 'access_revoked',
			revokedAt: '2026-02-23T11:00:00.000Z',
		});

		expect(harness.getState().mapAccessError).toEqual({
			type: 'access_denied',
			isAnonymous: false,
		});
		expect(harness.unsubscribeFromRealtimeUpdates).toHaveBeenCalledTimes(1);
	});

	it('ignores revoked events for another map or another user', () => {
		const harness = createPermissionsSliceHarness();

		harness.applyPermissionEvent({
			type: 'permissions:revoked',
			mapId: 'map-2',
			targetUserId: 'user-1',
			reason: 'access_revoked',
			revokedAt: '2026-02-23T11:05:00.000Z',
		});
		expect(harness.getState().mapAccessError).toBeNull();

		harness.applyPermissionEvent({
			type: 'permissions:revoked',
			mapId: 'map-1',
			targetUserId: 'user-2',
			reason: 'access_revoked',
			revokedAt: '2026-02-23T11:06:00.000Z',
		});
		expect(harness.getState().mapAccessError).toBeNull();
		expect(harness.unsubscribeFromRealtimeUpdates).not.toHaveBeenCalled();
	});
});
