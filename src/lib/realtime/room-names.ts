export type MindMapRealtimeChannel =
	| 'sync'
	| 'cursor'
	| 'presence'
	| 'selected-nodes'
	| 'permissions';

export function getMindMapRoomName(
	mapId: string,
	channel: MindMapRealtimeChannel = 'sync'
): string {
	return `mind-map:${mapId}:${channel}`;
}
