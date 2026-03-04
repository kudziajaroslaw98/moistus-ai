export type MindMapRealtimeChannel =
	| 'sync'
	| 'cursor'
	| 'presence'
	| 'selected-nodes'
	| 'permissions'
	| 'sharing';

export type UserRealtimeChannel = 'notifications';

export function getMindMapRoomName(
	mapId: string,
	channel: MindMapRealtimeChannel = 'sync'
): string {
	return `mind-map:${mapId}:${channel}`;
}

export function getUserRealtimeRoomName(
	userId: string,
	channel: UserRealtimeChannel = 'notifications'
): string {
	return `user:${userId}:${channel}`;
}
