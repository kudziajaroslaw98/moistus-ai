import {
	getPagedCurrentCheckpointEvents,
	isInCurrentCheckpointScope,
	resolveCurrentSnapshotId,
} from './history-current-scope';

describe('history current checkpoint scope', () => {
	it('uses map_history_current as the visible snapshot boundary', () => {
		expect(
			resolveCurrentSnapshotId(
				{ snapshot_id: 'checkpoint-current', event_id: null },
				{ id: 'checkpoint-latest' }
			)
		).toBe('checkpoint-current');
	});

	it('falls back to the latest snapshot only when no current pointer exists', () => {
		expect(resolveCurrentSnapshotId(null, { id: 'checkpoint-latest' })).toBe(
			'checkpoint-latest'
		);
	});

	it('keeps events outside the current checkpoint out of the active sidebar', () => {
		expect(isInCurrentCheckpointScope('checkpoint-current', 'checkpoint-current')).toBe(
			true
		);
		expect(isInCurrentCheckpointScope('checkpoint-old', 'checkpoint-current')).toBe(
			false
		);
	});

	it('paginates active events without counting the checkpoint snapshot as an event', () => {
		const events = Array.from({ length: 5 }, (_, index) => ({
			id: `event-${index}`,
			snapshot_id: 'checkpoint-current',
			event_index: 4 - index,
		}));

		const firstPage = getPagedCurrentCheckpointEvents(events, 0, 3);
		expect(firstPage.events.map((event) => event.id)).toEqual([
			'event-0',
			'event-1',
			'event-2',
		]);
		expect(firstPage.nextOffset).toBe(3);
		expect(firstPage.hasMore).toBe(true);

		const secondPage = getPagedCurrentCheckpointEvents(
			events,
			firstPage.nextOffset,
			3
		);
		expect(secondPage.events.map((event) => event.id)).toEqual([
			'event-3',
			'event-4',
		]);
		expect(secondPage.nextOffset).toBe(5);
		expect(secondPage.hasMore).toBe(false);
	});
});
