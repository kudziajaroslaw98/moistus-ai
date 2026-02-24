jest.mock('@/helpers/supabase/shared-client', () => ({
	getSharedSupabaseClient: () => ({
		auth: {
			getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
		},
	}),
}));

import { computeSyncEventPruneCount } from './yjs-provider';

describe('computeSyncEventPruneCount', () => {
	it('returns 0 when there is no excess', () => {
		const cursors = new Map<string, number>([['sub-1', 10]]);
		expect(computeSyncEventPruneCount(150, 200, cursors)).toBe(0);
	});

	it('prunes full excess when all subscribers consumed old events', () => {
		const cursors = new Map<string, number>([
			['sub-1', 250],
			['sub-2', 240],
		]);
		expect(computeSyncEventPruneCount(250, 200, cursors)).toBe(50);
	});

	it('bounds prune count by the slowest subscriber cursor', () => {
		const cursors = new Map<string, number>([
			['sub-fast', 230],
			['sub-slow', 20],
		]);
		expect(computeSyncEventPruneCount(250, 200, cursors)).toBe(20);
	});

	it('prunes excess when there are no subscribers', () => {
		expect(computeSyncEventPruneCount(240, 200, new Map())).toBe(40);
	});
});
