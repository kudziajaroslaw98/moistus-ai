import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';

/** UUID whose hex starts with `prefix` (padded with zeros). */
export function uuidFrom(prefix: string): string {
	const hex = prefix.padEnd(32, '0');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function makeNode(id: string, overrides: Partial<NodeData> = {}): NodeData {
	return {
		id,
		map_id: 'map',
		parent_id: null,
		content: '',
		position_x: 0,
		position_y: 0,
		node_type: 'defaultNode',
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		metadata: {},
		...overrides,
	};
}

export function makeEdge(
	id: string,
	source: string,
	target: string,
	overrides: Partial<EdgeData> = {}
): EdgeData {
	return {
		id,
		map_id: 'map',
		user_id: 'user',
		source,
		target,
		created_at: '2026-01-01T00:00:00Z',
		...overrides,
	};
}
