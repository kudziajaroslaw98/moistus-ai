import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { HistoryDelta } from '@/types/history-state';
import {
	buildHistoryPresentation,
	collectHistoryFieldLabels,
	deriveHistorySubjectHints,
} from './presentation';

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
	it('uses object-first summary for one property field', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: { 'data.metadata.priority': 'high' },
					reversePatch: { 'data.metadata.priority': 'low' },
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'saveNodeProperties',
			nodes: [createNode('node-1', 'Readable node')],
		});

		expect(presentation.summary).toBe('Priority updated');
		expect(presentation.summaryDetail).toBeUndefined();
	});

	it('uses "cleared" for empty target values', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: { 'data.metadata.dueDate': null },
					reversePatch: { 'data.metadata.dueDate': '2026-04-29T22:00:00.000Z' },
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'saveNodeProperties',
			nodes: [createNode('node-1', 'Readable node')],
		});

		expect(presentation.summary).toBe('Due date cleared');
	});

	it('lists up to three fields and adds a property count detail', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: {
						'data.content': 'New note',
						'data.metadata.tags': ['tag-1'],
						'data.metadata.dueDate': '2026-04-29T22:00:00.000Z',
					},
					reversePatch: {
						'data.content': 'Old note',
						'data.metadata.tags': [],
						'data.metadata.dueDate': null,
					},
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'saveNodeProperties',
		});

		expect(presentation.summary).toBe('Note, Tags & Due date updated');
		expect(presentation.summaryDetail).toBe('3 properties');
	});

	it('switches to count summary for four or more property fields', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: {
						'data.content': 'New note',
						'data.metadata.tags': ['tag-1'],
						'data.metadata.dueDate': '2026-04-29T22:00:00.000Z',
						'data.metadata.priority': 'high',
					},
					reversePatch: {
						'data.content': 'Old note',
						'data.metadata.tags': [],
						'data.metadata.dueDate': null,
						'data.metadata.priority': 'low',
					},
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'saveNodeProperties',
		});

		expect(presentation.summary).toBe('4 properties updated');
	});

	it('handles mixed intents by concatenating two phrases', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: {
						'position.x': 100,
						'position.y': 100,
						'data.metadata.tags': ['tag-1'],
					},
					reversePatch: {
						'position.x': 10,
						'position.y': 20,
						'data.metadata.tags': [],
					},
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'moveNode',
			nodes: [createNode('node-1', 'Node')],
		});

		expect(presentation.summary).toBe('Node moved, Tags updated');
	});

	it('uses bulk same-field summaries across many nodes', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: { 'data.metadata.tags': ['tag-1'] },
					reversePatch: { 'data.metadata.tags': [] },
				},
				{
					id: 'node-2',
					type: 'node',
					op: 'patch',
					patch: { 'data.metadata.tags': ['tag-2'] },
					reversePatch: { 'data.metadata.tags': [] },
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'saveNodeProperties',
		});

		expect(presentation.summary).toBe('Tags updated on 2 nodes');
	});

	it('falls back to node type + short id when title is missing', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
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
			nodes: [
				createNode('abcdef12-3456-7890', 'Very long content without title'),
			],
		});

		expect(presentation.subjects[0].label).toBe('Default node #abcdef12');
	});

	it('summarizes routing updates as rerouted connections', () => {
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
			actionName: 'updateEdge',
			nodes: [createNode('source', 'Source'), createNode('target', 'Target')],
			edges: [createEdge('edge-1', 'source', 'target')],
		});

		expect(presentation.summary).toBe('Connection rerouted');
		expect(presentation.reroutedConnectionCount).toBe(1);
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
	});

	it('collects distinct changed field labels without bookkeeping fields', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'node-1',
					type: 'node',
					op: 'patch',
					patch: { width: 400, height: 400, updated_at: 'now' },
					reversePatch: { width: null, height: null, updated_at: 'then' },
				},
				{
					id: 'node-2',
					type: 'node',
					op: 'patch',
					patch: { height: 200, 'position.x': 10, 'position.y': 20 },
					reversePatch: { height: 100, 'position.x': 0, 'position.y': 0 },
				},
			],
		};

		const presentation = buildHistoryPresentation(delta, {
			actionName: 'resizeNode',
		});

		expect(collectHistoryFieldLabels(presentation)).toEqual([
			'Width',
			'Height',
		]);
	});

	it('returns no field labels for add/remove changes', () => {
		const delta: HistoryDelta = {
			operation: 'add',
			entityType: 'node',
			changes: [{ id: 'node-1', type: 'node', op: 'add', value: {} }],
		};

		expect(
			collectHistoryFieldLabels(
				buildHistoryPresentation(delta, { actionName: 'addNode' })
			)
		).toEqual([]);
	});
});

describe('deriveHistorySubjectHints for plugin nodes', () => {
	it('keeps the plugin kind label so rows can name the node later', () => {
		const metric = {
			...createNode('m1', 'Signups: 5 / 10'),
			type: 'extensionNode',
			data: {
				...createNode('m1', 'Signups: 5 / 10').data,
				node_type: 'extensionNode',
				metadata: {
					extension: {
						pluginId: 'shiko.metric',
						kind: 'metric',
						kindLabel: 'Metric',
						version: '0.1.0',
						data: {},
					},
				},
			},
		} as AppNode;
		const delta: HistoryDelta = {
			operation: 'add',
			entityType: 'node',
			changes: [{ id: 'm1', type: 'node', op: 'add', value: metric }],
		};

		expect(
			deriveHistorySubjectHints(delta, { nodes: [metric] })[0]
		).toMatchObject({
			nodeType: 'extensionNode',
			nodeKindLabel: 'Metric',
		});
	});
});

describe('plugin node field changes', () => {
	it('lists the plugin data fields, not the derived summary and saved view', () => {
		const delta: HistoryDelta = {
			operation: 'update',
			entityType: 'node',
			changes: [
				{
					id: 'm1',
					type: 'node',
					op: 'patch',
					patch: {
						'data.content': 'Users: 6 / 10',
						'data.metadata.extension.data.value': 6,
						'data.metadata.extension.snapshot.children.1.value': '6',
					},
					reversePatch: {
						'data.content': 'Users: 5 / 10',
						'data.metadata.extension.data.value': 5,
						'data.metadata.extension.snapshot.children.1.value': '5',
					},
				},
			],
		};

		expect(collectHistoryFieldLabels(buildHistoryPresentation(delta, {}))).toEqual(['Value']);
	});

	const refresh = (patch: Record<string, unknown>, reversePatch: Record<string, unknown>) =>
		collectHistoryFieldLabels(
			buildHistoryPresentation(
				{
					operation: 'update',
					entityType: 'node',
					changes: [{ id: 'i1', type: 'node', op: 'patch', patch, reversePatch }],
				},
				{}
			)
		);

	it('names a refresh by what it fetched, or as "Last refresh" when nothing changed', () => {
		expect(
			refresh(
				{
					'data.metadata.extension.data.state': 'closed',
					'data.metadata.extension.fetchedAt': '2026-10-06T12:00:00.000Z',
				},
				{
					'data.metadata.extension.data.state': 'open',
					'data.metadata.extension.fetchedAt': '2026-10-06T11:00:00.000Z',
				}
			)
		).toEqual(['State']);
		expect(
			refresh(
				{ 'data.metadata.extension.fetchedAt': '2026-10-06T12:00:00.000Z' },
				{ 'data.metadata.extension.fetchedAt': '2026-10-06T11:00:00.000Z' }
			)
		).toEqual(['Last refresh']);
	});
});
