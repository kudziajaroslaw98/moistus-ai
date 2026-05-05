import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { HistoryDelta } from '@/types/history-state';
import { buildHistoryPresentation } from './presentation';

function createNode(
	id: string,
	content: string,
	position = { x: 0, y: 0 }
): AppNode {
	return {
		id,
		position,
		type: 'defaultNode',
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content,
			position_x: position.x,
			position_y: position.y,
			node_type: 'defaultNode',
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
		},
	};
}

function createEdge(id: string, source: string, target: string): AppEdge {
	return {
		id,
		source,
		target,
		type: 'waypointEdge',
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			type: 'waypointEdge',
			label: null,
		},
	};
}

describe('history presentation', () => {
	it('groups position x/y patches into one readable movement change', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: {
						'position.x': 50,
						'position.y': 60,
					},
					reversePatch: {
						'position.x': 10,
						'position.y': 20,
					},
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'moveNodes',
			nodes: [createNode('node-1', 'Moved node', { x: 50, y: 60 })],
			previousNodes: [createNode('node-1', 'Moved node', { x: 10, y: 20 })],
		});

		expect(presentation.summary).toBe('Moved 1 node.');
		expect(presentation.subjects[0].label).toBe('Moved node');
		expect(presentation.subjects[0].changes).toHaveLength(1);
		expect(presentation.subjects[0].changes[0]).toMatchObject({
			kind: 'move',
			oldValue: '(10, 20)',
			newValue: '(50, 60)',
		});
	});

	it('summarizes waypoint-only edge patches as routing changes', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'edge',
			changes: [
				{
					id: 'edge-1',
					type: 'edge',
					op: 'patch',
					patch: {
						'data.metadata.waypoints.0.x': 1360,
						'data.metadata.waypoints.0.y': 126.5,
					},
					reversePatch: {
						'data.metadata.waypoints.0.x': 1568,
						'data.metadata.waypoints.0.y': 1438.5,
					},
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'applyLayout',
			nodes: [createNode('source', 'Source'), createNode('target', 'Target')],
			edges: [createEdge('edge-1', 'source', 'target')],
		});

		expect(presentation.reroutedConnectionCount).toBe(1);
		expect(presentation.subjects[0].label).toBe('Source -> Target');
		expect(presentation.subjects[0].changes).toHaveLength(1);
		expect(presentation.subjects[0].changes[0]).toMatchObject({
			kind: 'route',
			summary: 'Rerouted connection line',
		});
	});

	it('resolves patch-only node labels from current nodes or a short id fallback', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: { 'data.metadata.status': 'done' },
					reversePatch: { 'data.metadata.status': 'draft' },
				},
				{
					id: 'abcdef12-3456-7890',
					type: 'node',
					op: 'patch',
					patch: { 'data.metadata.priority': 'high' },
					reversePatch: { 'data.metadata.priority': 'low' },
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'updateNode',
			nodes: [createNode('node-1', 'Current label')],
		});

		expect(presentation.subjects[0].label).toBe('Current label');
		expect(presentation.subjects[1].label).toBe('Node abcdef12');
	});

	it('uses readable labels for added and removed connections', () => {
		const delta: HistoryDelta = {
			operation: 'add',
			entityType: 'edge',
			changes: [
				{
					id: 'edge-1',
					type: 'edge',
					op: 'add',
					value: createEdge('edge-1', 'source', 'target'),
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'addEdge',
			nodes: [createNode('source', 'Source'), createNode('target', 'Target')],
		});

		expect(presentation.summary).toBe('Added connection: Source -> Target.');
		expect(presentation.subjects[0]).toMatchObject({
			type: 'edge',
			label: 'Source -> Target',
			description: 'Source -> Target',
		});
	});

	it('keeps raw technical changes available', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: { 'data.content': 'New content' },
					reversePatch: { 'data.content': 'Old content' },
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'updateNode',
		});

		expect(presentation.technicalChanges).toBe(delta.changes);
		expect(presentation.subjects[0].changes[0]).toMatchObject({
			label: 'Content',
			oldValue: 'Old content',
			newValue: 'New content',
		});
	});
});
