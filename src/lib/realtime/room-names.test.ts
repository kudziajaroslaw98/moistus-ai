import { getMindMapRoomName } from '@/lib/realtime/room-names';

describe('getMindMapRoomName', () => {
	const mapId = '11111111-2222-3333-4444-555555555555';

	it('uses sync channel by default', () => {
		expect(getMindMapRoomName(mapId)).toBe(`mind-map:${mapId}:sync`);
	});

	it('supports all realtime channels', () => {
		expect(getMindMapRoomName(mapId, 'sync')).toBe(`mind-map:${mapId}:sync`);
		expect(getMindMapRoomName(mapId, 'cursor')).toBe(
			`mind-map:${mapId}:cursor`
		);
		expect(getMindMapRoomName(mapId, 'presence')).toBe(
			`mind-map:${mapId}:presence`
		);
		expect(getMindMapRoomName(mapId, 'selected-nodes')).toBe(
			`mind-map:${mapId}:selected-nodes`
		);
		expect(getMindMapRoomName(mapId, 'permissions')).toBe(
			`mind-map:${mapId}:permissions`
		);
	});
});
