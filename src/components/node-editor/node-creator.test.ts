import type { AppNode } from '@/types/app-node';
import { createNodeFromCommand } from './node-creator';
import type { Command } from './core/commands/command-types';

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'new-node'));

const host = {
	id: 'host',
	type: 'defaultNode',
	position: { x: 100, y: 50 },
	measured: { width: 300, height: 80 },
	data: { id: 'host', node_type: 'defaultNode', metadata: {} },
} as unknown as AppNode;

const command = (nodeType: string) => ({ nodeType }) as unknown as Command;

describe('createNodeFromCommand', () => {
	it('anchors annotations created from a node instead of parenting them', async () => {
		const addNode = jest.fn();

		await createNodeFromCommand({
			command: command('annotationNode'),
			data: { content: 'Breaking change', metadata: { annotationType: 'warning' } },
			position: { x: 0, y: 999 },
			parentNode: host,
			addNode,
		});

		const call = addNode.mock.calls[0][0];
		expect(call.parentNode).toBeNull();
		expect(call.data.parent_id).toBeNull();
		expect(call.position).toEqual({ x: 448, y: 50 });
		expect(call.data.metadata).toEqual(
			expect.objectContaining({
				annotationType: 'warning',
				anchorNodeId: 'host',
				anchorOffset: { x: 348, y: 0 },
			})
		);
	});

	it('creates a free annotation when started from another annotation', async () => {
		const addNode = jest.fn();
		const annotationParent = {
			...host,
			type: 'annotationNode',
			data: { ...host.data, node_type: 'annotationNode' },
		} as unknown as AppNode;

		await createNodeFromCommand({
			command: command('annotationNode'),
			data: { content: 'note' },
			position: { x: 5, y: 6 },
			parentNode: annotationParent,
			addNode,
		});

		const call = addNode.mock.calls[0][0];
		expect(call.parentNode).toBeNull();
		expect(call.position).toEqual({ x: 5, y: 6 });
		expect(call.data.metadata.anchorNodeId).toBeUndefined();
	});

	it('keeps hierarchy for non-annotation children', async () => {
		const addNode = jest.fn();

		await createNodeFromCommand({
			command: command('defaultNode'),
			data: { content: 'child' },
			position: { x: 1, y: 2 },
			parentNode: host,
			addNode,
		});

		const call = addNode.mock.calls[0][0];
		expect(call.parentNode).toBe(host);
		expect(call.data.parent_id).toBe('host');
	});
});
