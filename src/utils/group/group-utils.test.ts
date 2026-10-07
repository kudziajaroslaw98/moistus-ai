import type { AppNode } from '@/types/app-node';
import {
	findGroupAtPoint,
	findNodeGroup,
	getNodeRect,
	resolveGroupDragIntent,
} from './group-utils';

function makeNode(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	metadata: Record<string, unknown> = {}
): AppNode {
	return {
		id,
		position: { x, y },
		measured: { width, height },
		data: { id, node_type: 'defaultNode', metadata },
	} as unknown as AppNode;
}

function makeGroup(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	children: string[] = []
): AppNode {
	return makeNode(id, x, y, width, height, {
		isGroup: true,
		groupChildren: children,
	});
}

describe('getNodeRect', () => {
	it('prefers measured dimensions and falls back to defaults', () => {
		expect(getNodeRect(makeNode('a', 10, 20, 50, 60))).toEqual({
			x: 10,
			y: 20,
			width: 50,
			height: 60,
		});

		const unmeasured = {
			id: 'b',
			position: { x: 0, y: 0 },
			data: { id: 'b', metadata: {} },
		} as unknown as AppNode;
		expect(getNodeRect(unmeasured)).toEqual({
			x: 0,
			y: 0,
			width: 320,
			height: 100,
		});
	});
});

describe('findGroupAtPoint', () => {
	it('returns the smallest group containing the point', () => {
		const big = makeGroup('big', 0, 0, 1000, 1000);
		const small = makeGroup('small', 100, 100, 200, 200);
		const other = makeNode('n', 150, 150, 10, 10);

		expect(findGroupAtPoint([big, small, other], { x: 150, y: 150 })?.id).toBe(
			'small'
		);
		expect(findGroupAtPoint([big, small], { x: 500, y: 500 })?.id).toBe('big');
		expect(findGroupAtPoint([big, small], { x: 2000, y: 0 })).toBeNull();
	});

	it('skips excluded ids', () => {
		const small = makeGroup('small', 100, 100, 200, 200);
		expect(
			findGroupAtPoint([small], { x: 150, y: 150 }, new Set(['small']))
		).toBeNull();
	});
});

describe('resolveGroupDragIntent', () => {
	const groupA = makeGroup('A', 0, 0, 400, 400, ['a1']);
	const groupB = makeGroup('B', 1000, 0, 400, 400, ['b1']);
	const emptyGroup = makeGroup('E', 2000, 0, 400, 400);

	it('returns add when an ungrouped node hovers a group', () => {
		const free = makeNode('free', 100, 100, 100, 50);
		expect(
			resolveGroupDragIntent({
				allNodes: [groupA, free],
				draggedNodes: [free],
				primaryNode: free,
			})
		).toEqual({ type: 'add', groupId: 'A', nodeIds: ['free'] });
	});

	it('targets empty groups', () => {
		const free = makeNode('free', 2100, 100, 100, 50);
		expect(
			resolveGroupDragIntent({
				allNodes: [emptyGroup, free],
				draggedNodes: [free],
				primaryNode: free,
			})
		).toEqual({ type: 'add', groupId: 'E', nodeIds: ['free'] });
	});

	it('returns null when a member hovers its own group', () => {
		const a1 = makeNode('a1', 100, 100, 100, 50, { groupId: 'A' });
		expect(
			resolveGroupDragIntent({
				allNodes: [groupA, a1],
				draggedNodes: [a1],
				primaryNode: a1,
			})
		).toBeNull();
	});

	it('returns remove when a member leaves its group', () => {
		const a1 = makeNode('a1', 600, 600, 100, 50, { groupId: 'A' });
		expect(
			resolveGroupDragIntent({
				allNodes: [groupA, a1],
				draggedNodes: [a1],
				primaryNode: a1,
			})
		).toEqual({ type: 'remove', groupId: 'A', nodeIds: ['a1'] });
	});

	it('returns add (move) when a member hovers another group', () => {
		const a1 = makeNode('a1', 1100, 100, 100, 50, { groupId: 'A' });
		expect(
			resolveGroupDragIntent({
				allNodes: [groupA, groupB, a1],
				draggedNodes: [a1],
				primaryNode: a1,
			})
		).toEqual({ type: 'add', groupId: 'B', nodeIds: ['a1'] });
	});

	it('only includes dragged nodes not already in the target group', () => {
		const free = makeNode('free', 1100, 100, 100, 50);
		const b1 = makeNode('b1', 1200, 200, 100, 50, { groupId: 'B' });
		expect(
			resolveGroupDragIntent({
				allNodes: [groupB, free, b1],
				draggedNodes: [free, b1],
				primaryNode: free,
			})
		).toEqual({ type: 'add', groupId: 'B', nodeIds: ['free'] });
	});

	it('only removes dragged nodes that belong to a group', () => {
		const a1 = makeNode('a1', 600, 600, 100, 50, { groupId: 'A' });
		const free = makeNode('free', 700, 700, 100, 50);
		expect(
			resolveGroupDragIntent({
				allNodes: [groupA, a1, free],
				draggedNodes: [a1, free],
				primaryNode: a1,
			})
		).toEqual({ type: 'remove', groupId: 'A', nodeIds: ['a1'] });
	});

	it('returns null when a group is part of the drag', () => {
		const a1 = makeNode('a1', 100, 100, 100, 50, { groupId: 'A' });
		expect(
			resolveGroupDragIntent({
				allNodes: [groupA, groupB, a1],
				draggedNodes: [groupA, a1],
				primaryNode: a1,
			})
		).toBeNull();
	});

	it('returns null for an ungrouped node over empty canvas', () => {
		const free = makeNode('free', 5000, 5000, 100, 50);
		expect(
			resolveGroupDragIntent({
				allNodes: [groupA, free],
				draggedNodes: [free],
				primaryNode: free,
			})
		).toBeNull();
	});
});

describe('findNodeGroup', () => {
	const group = makeGroup('G', 0, 0, 400, 400, ['listed']);

	it('resolves via metadata.groupId when that group exists', () => {
		const member = makeNode('m', 0, 0, 10, 10, { groupId: 'G' });
		expect(findNodeGroup([group, member], member)?.id).toBe('G');
	});

	it('falls back to groupChildren when groupId points at a missing node', () => {
		const listed = makeNode('listed', 0, 0, 10, 10, { groupId: 'phantom' });
		expect(findNodeGroup([group, listed], listed)?.id).toBe('G');
	});

	it('returns null for orphan groupIds that no group lists', () => {
		const orphan = makeNode('orphan', 0, 0, 10, 10, { groupId: 'phantom' });
		expect(findNodeGroup([group, orphan], orphan)).toBeNull();
	});
});

describe('resolveGroupDragIntent with phantom groupIds', () => {
	// Groups created before the createGroupFromSelected id fix: members point
	// at a non-existent id while the real group lists them in groupChildren.
	const group = makeGroup('G', 0, 0, 400, 400, ['m']);

	it('targets the real group when a phantom-id member leaves it', () => {
		const member = makeNode('m', 900, 900, 100, 50, { groupId: 'phantom' });
		expect(
			resolveGroupDragIntent({
				allNodes: [group, member],
				draggedNodes: [member],
				primaryNode: member,
			})
		).toEqual({ type: 'remove', groupId: 'G', nodeIds: ['m'] });
	});

	it('returns null while a phantom-id member stays inside its real group', () => {
		const member = makeNode('m', 100, 100, 100, 50, { groupId: 'phantom' });
		expect(
			resolveGroupDragIntent({
				allNodes: [group, member],
				draggedNodes: [member],
				primaryNode: member,
			})
		).toBeNull();
	});
});
