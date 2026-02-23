import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import {
	getEdgeActorId,
	getNodeActorId,
	serializeEdgeForRealtime,
	serializeNodeForRealtime,
} from './graph-sync';

describe('graph-sync helpers', () => {
	it('resolves node actor id from preferred id or node payload', () => {
		const node = {
			id: 'node-1',
			position: { x: 10, y: 20 },
			data: { id: 'node-1', user_id: 'node-user' },
		} as unknown as AppNode;

		expect(getNodeActorId(node, 'preferred-user')).toBe('preferred-user');
		expect(getNodeActorId(node)).toBe('node-user');
	});

	it('serializes node payload for realtime updates', () => {
		const node = {
			id: 'node-1',
			type: 'defaultNode',
			position: { x: 100, y: 200 },
			width: 320,
			height: 120,
			data: {
				id: 'node-1',
				user_id: 'node-creator',
				content: 'Node',
				created_at: '2026-01-01T00:00:00.000Z',
				metadata: { color: 'red' },
				aiData: { source: 'test' },
			},
		} as unknown as AppNode;

		const payload = serializeNodeForRealtime(
			node,
			'11111111-2222-3333-4444-555555555555',
			'user-1'
		);

		expect(payload.id).toBe('node-1');
		expect(payload.map_id).toBe('11111111-2222-3333-4444-555555555555');
		expect(payload.user_id).toBe('node-creator');
		expect(payload.position_x).toBe(100);
		expect(payload.position_y).toBe(200);
		expect(payload.content).toBe('Node');
		expect(payload.node_type).toBe('defaultNode');
	});

	it('resolves edge actor id and serializes edge payload', () => {
		const edge = {
			id: 'edge-1',
			source: 'node-a',
			target: 'node-b',
			label: 'Edge label',
			data: {
				id: 'edge-1',
				user_id: 'edge-user',
				style: { stroke: '#000' },
				metadata: { pathType: 'floating' },
			},
		} as unknown as AppEdge;

		expect(getEdgeActorId(edge, 'preferred-edge-user')).toBe(
			'preferred-edge-user'
		);
		expect(getEdgeActorId(edge)).toBe('edge-user');

		const payload = serializeEdgeForRealtime(
			edge,
			'11111111-2222-3333-4444-555555555555',
			'user-2'
		);

		expect(payload.id).toBe('edge-1');
		expect(payload.map_id).toBe('11111111-2222-3333-4444-555555555555');
		expect(payload.user_id).toBe('edge-user');
		expect(payload.source).toBe('node-a');
		expect(payload.target).toBe('node-b');
		expect(payload.label).toBe('Edge label');
	});
});
