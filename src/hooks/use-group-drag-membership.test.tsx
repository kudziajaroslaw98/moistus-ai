import { act, renderHook } from '@testing-library/react';
import type { AppNode } from '@/types/app-node';
import type { GroupDragState } from '@/store/app-state';
import { useGroupDragMembership } from './use-group-drag-membership';

const mockState: {
	nodes: AppNode[];
	groupDragIntent: GroupDragState | null;
	setGroupDragIntent: jest.Mock;
	setNodesGroup: jest.Mock;
} = {
	nodes: [],
	groupDragIntent: null,
	setGroupDragIntent: jest.fn(),
	setNodesGroup: jest.fn(),
};

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: { getState: () => mockState },
}));

jest.mock('sonner', () => ({
	toast: { error: jest.fn() },
}));

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

const group = makeNode('G', 0, 0, 400, 400, {
	isGroup: true,
	groupChildren: [],
});
const inside = makeNode('n', 100, 100, 100, 50);
const outside = makeNode('n', 900, 900, 100, 50);
const dragEvent = {} as React.MouseEvent;

describe('useGroupDragMembership', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockState.nodes = [group, inside];
		mockState.groupDragIntent = null;
		mockState.setGroupDragIntent.mockReset();
		mockState.setGroupDragIntent.mockImplementation(
			(intent: GroupDragState | null) => {
				mockState.groupDragIntent = intent;
			}
		);
		mockState.setNodesGroup.mockReset();
		mockState.setNodesGroup.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('does not commit when released before the dwell completes', () => {
		const { result } = renderHook(() =>
			useGroupDragMembership({ canEdit: true })
		);

		act(() => {
			result.current.onNodeDrag(dragEvent, inside, [inside]);
			jest.advanceTimersByTime(300);
		});

		expect(mockState.groupDragIntent).toEqual({
			type: 'add',
			groupId: 'G',
			nodeIds: ['n'],
			armed: false,
		});

		act(() => {
			result.current.onNodeDragStop();
		});

		expect(mockState.setNodesGroup).not.toHaveBeenCalled();
		expect(mockState.groupDragIntent).toBeNull();
	});

	it('arms after the dwell and commits on drop', () => {
		const { result } = renderHook(() =>
			useGroupDragMembership({ canEdit: true })
		);

		act(() => {
			result.current.onNodeDrag(dragEvent, inside, [inside]);
			jest.advanceTimersByTime(600);
		});

		expect(mockState.groupDragIntent?.armed).toBe(true);

		act(() => {
			result.current.onNodeDragStop();
		});

		expect(mockState.setNodesGroup).toHaveBeenCalledWith(['n'], 'G');
		expect(mockState.groupDragIntent).toBeNull();
	});

	it('keeps the dwell timer running while the same intent repeats', () => {
		const { result } = renderHook(() =>
			useGroupDragMembership({ canEdit: true })
		);

		act(() => {
			result.current.onNodeDrag(dragEvent, inside, [inside]);
			jest.advanceTimersByTime(400);
			result.current.onNodeDrag(dragEvent, inside, [inside]);
			jest.advanceTimersByTime(200);
		});

		expect(mockState.groupDragIntent?.armed).toBe(true);
	});

	it('cancels the dwell when the node leaves the target', () => {
		const { result } = renderHook(() =>
			useGroupDragMembership({ canEdit: true })
		);

		act(() => {
			result.current.onNodeDrag(dragEvent, inside, [inside]);
			jest.advanceTimersByTime(400);
			result.current.onNodeDrag(dragEvent, outside, [outside]);
			jest.advanceTimersByTime(600);
		});

		expect(mockState.groupDragIntent).toBeNull();

		act(() => {
			result.current.onNodeDragStop();
		});

		expect(mockState.setNodesGroup).not.toHaveBeenCalled();
	});

	it('removes a member after dwelling outside its group', () => {
		const member = makeNode('m', 900, 900, 100, 50, { groupId: 'G' });
		mockState.nodes = [group, member];
		const { result } = renderHook(() =>
			useGroupDragMembership({ canEdit: true })
		);

		act(() => {
			result.current.onNodeDrag(dragEvent, member, [member]);
			jest.advanceTimersByTime(600);
			result.current.onNodeDragStop();
		});

		expect(mockState.setNodesGroup).toHaveBeenCalledWith(['m'], null);
	});

	it('ignores nodes that are not in the store (e.g. ghost nodes)', () => {
		const ghost = makeNode('ghost', 100, 100, 100, 50);
		const { result } = renderHook(() =>
			useGroupDragMembership({ canEdit: true })
		);

		act(() => {
			result.current.onNodeDrag(dragEvent, ghost, [ghost]);
		});

		expect(mockState.setGroupDragIntent).not.toHaveBeenCalled();
	});

	it('is a no-op without edit permission', () => {
		const { result } = renderHook(() =>
			useGroupDragMembership({ canEdit: false })
		);

		act(() => {
			result.current.onNodeDrag(dragEvent, inside, [inside]);
			jest.advanceTimersByTime(600);
			result.current.onNodeDragStop();
		});

		expect(mockState.setGroupDragIntent).not.toHaveBeenCalled();
		expect(mockState.setNodesGroup).not.toHaveBeenCalled();
	});
});
