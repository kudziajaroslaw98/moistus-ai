import type { CollaboratorRealtimeEvent } from '@/lib/realtime/collaborator-events';

jest.mock('@/helpers/supabase/shared-client', () => ({
	getSharedSupabaseClient: () => ({
		auth: {
			getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
			getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
			signInAnonymously: jest.fn(),
		},
	}),
}));

jest.mock('@/lib/realtime/collaborator-channel', () => ({
	subscribeToCollaboratorChannel: jest.fn(),
}));

type ShareAccessRow = {
	id: number;
	created_at: string;
	updated_at: string;
	user_id: string;
	map_id: string;
	role: 'owner' | 'editor' | 'commentator' | 'viewer';
	can_view: boolean;
	can_comment: boolean;
	can_edit: boolean;
	full_name: string | null;
	display_name: string | null;
	email: string | null;
	avatar_url: string | null;
	is_anonymous: boolean;
	token_created_by: string;
};

function createSharingSliceHarness(shareRows: ShareAccessRow[] = []) {
	const { createSharingSlice } =
		require('@/store/slices/sharing-slice') as typeof import('@/store/slices/sharing-slice');

	const order = jest.fn().mockResolvedValue({
		data: shareRows,
		error: null,
	});
	const eqStatus = jest.fn().mockReturnValue({ order });
	const eqMap = jest.fn().mockReturnValue({ eq: eqStatus });
	const select = jest.fn().mockReturnValue({ eq: eqMap });
	const from = jest.fn().mockReturnValue({ select });

	let state: Record<string, unknown> = {
		mapId: 'map-1',
		currentShares: [],
		supabase: {
			from,
		},
		setState: (partial: Record<string, unknown>) => {
			state = { ...state, ...partial };
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
	const slice = createSharingSlice(set as never, get as never, {} as never);
	state = { ...state, ...slice };

	return {
		getState: () => state,
		getCurrentShareUsers: slice.getCurrentShareUsers,
		applyCollaboratorRealtimeEvent: slice.applyCollaboratorRealtimeEvent,
		mocks: { from, select, eqMap, eqStatus, order },
	};
}

function buildSnapshotEvent(
	overrides: Partial<CollaboratorRealtimeEvent> = {}
): CollaboratorRealtimeEvent {
	return {
		type: 'sharing:collaborators:snapshot',
		mapId: 'map-1',
		occurredAt: '2026-02-24T10:00:00.000Z',
		collaborators: [
			{
				shareId: 'share-1',
				mapId: 'map-1',
				userId: 'user-1',
				role: 'viewer',
				can_view: true,
				can_comment: false,
				can_edit: false,
				display_name: 'Snapshot Display',
				full_name: 'Snapshot Full',
				email: 'snapshot@example.com',
				avatar_url: null,
				is_anonymous: true,
				created_at: '2026-02-24T09:55:00.000Z',
				updated_at: '2026-02-24T09:55:00.000Z',
			},
		],
		...overrides,
	} as CollaboratorRealtimeEvent;
}

describe('sharing slice identity mapping', () => {
	it('maps initial share fetch with display_name first', async () => {
		const harness = createSharingSliceHarness([
			{
				id: 1,
				created_at: '2026-02-24T09:00:00.000Z',
				updated_at: '2026-02-24T09:00:00.000Z',
				user_id: 'user-1',
				map_id: 'map-1',
				role: 'viewer',
				can_view: true,
				can_comment: false,
				can_edit: false,
				full_name: 'Full Name',
				display_name: 'Display Name',
				email: 'user@example.com',
				avatar_url: null,
				is_anonymous: true,
				token_created_by: 'owner-1',
			},
		]);

		await harness.getCurrentShareUsers();

		const shares = harness.getState().currentShares as Array<{ name: string }>;
		expect(shares).toHaveLength(1);
		expect(shares[0].name).toBe('Display Name');
	});

	it('keeps display-name-first behavior for collaborator snapshots and upserts', () => {
		const harness = createSharingSliceHarness();

		harness.applyCollaboratorRealtimeEvent(buildSnapshotEvent());
		let shares = harness.getState().currentShares as Array<{ name: string }>;
		expect(shares[0].name).toBe('Snapshot Display');

		harness.applyCollaboratorRealtimeEvent({
			type: 'sharing:collaborator:upsert',
			mapId: 'map-1',
			occurredAt: '2026-02-24T10:05:00.000Z',
			collaborator: {
				shareId: 'share-1',
				mapId: 'map-1',
				userId: 'user-1',
				role: 'viewer',
				can_view: true,
				can_comment: false,
				can_edit: false,
				display_name: '   ',
				full_name: null,
				email: 'fallback@example.com',
				avatar_url: null,
				is_anonymous: true,
				created_at: '2026-02-24T09:55:00.000Z',
				updated_at: '2026-02-24T10:05:00.000Z',
			},
		});

		shares = harness.getState().currentShares as Array<{ name: string }>;
		expect(shares[0].name).toBe('fallback');
	});
});

