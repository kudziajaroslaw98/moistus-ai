import type { AppNode } from '@/types/app-node';
import { renderHook } from '@testing-library/react';
import { useContextMenuConfig } from './use-context-menu-config';

let mockStoreState: Record<string, unknown>;
let mockPermissions = { canEdit: false, canComment: true };

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('zustand/shallow', () => ({
	useShallow: <T,>(selector: T) => selector,
}));

// The real registry pulls in every node component (ESM-only syntax highlighter).
jest.mock('@/registry/type-guards', () => ({
	isAvailableNodeType: () => true,
}));

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => mockPermissions,
}));

const createNode = (id: string, type: string, userId: string): AppNode =>
	({
		id,
		type,
		position: { x: 0, y: 0 },
		data: { id, user_id: userId, node_type: type },
	}) as unknown as AppNode;

function renderMenu(clickedNode: AppNode) {
	const deleteNodes = jest.fn();
	const deleteComment = jest.fn();
	mockStoreState = {
		nodes: [clickedNode],
		edges: [],
		updateEdge: jest.fn(),
		deleteNodes,
		deleteComment,
		deleteEdges: jest.fn(),
		currentUser: { id: 'me' },
		selectedNodes: [],
		reactFlowInstance: null,
		contextMenuState: { x: 0, y: 0, nodeId: clickedNode.id, edgeId: null },
		createGroupFromSelected: jest.fn(),
		ungroupNodes: jest.fn(),
		removeNodesFromGroup: jest.fn(),
		toggleNodeCollapse: jest.fn(),
		getDirectChildrenCount: () => 0,
		openNodeEditor: jest.fn(),
	};
	const onClose = jest.fn();
	const { result } = renderHook(() => useContextMenuConfig({ onClose }));
	const deleteItem = result.current.menuConfig
		.flatMap((section) => section.items)
		.find((item) => item.id === 'delete-node');

	return { deleteItem, deleteNodes, deleteComment, onClose };
}

describe('node context menu delete item', () => {
	beforeEach(() => {
		mockPermissions = { canEdit: false, canComment: true };
	});

	it('lets a commenter delete a thread they started, as a thread', () => {
		const { deleteItem, deleteComment, deleteNodes, onClose } = renderMenu(
			createNode('thread-1', 'commentNode', 'me')
		);

		expect(deleteItem).toMatchObject({ label: 'Delete Thread', hidden: false });
		deleteItem?.onClick();

		expect(deleteComment).toHaveBeenCalledWith('thread-1');
		expect(deleteNodes).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it("hides it on someone else's thread for a commenter", () => {
		const { deleteItem } = renderMenu(
			createNode('thread-1', 'commentNode', 'someone-else')
		);

		expect(deleteItem?.hidden).toBe(true);
	});

	it('hides it on an ordinary node for a commenter', () => {
		const { deleteItem } = renderMenu(createNode('note-1', 'defaultNode', 'me'));

		expect(deleteItem?.hidden).toBe(true);
	});

	it('lets an editor delete any thread, and ordinary nodes as before', () => {
		mockPermissions = { canEdit: true, canComment: true };

		const thread = renderMenu(
			createNode('thread-1', 'commentNode', 'someone-else')
		);
		expect(thread.deleteItem).toMatchObject({
			label: 'Delete Thread',
			hidden: false,
		});
		thread.deleteItem?.onClick();
		expect(thread.deleteComment).toHaveBeenCalledWith('thread-1');

		const note = renderMenu(createNode('note-1', 'defaultNode', 'me'));
		expect(note.deleteItem).toMatchObject({ label: 'Delete Node', hidden: false });
		note.deleteItem?.onClick();
		expect(note.deleteNodes).toHaveBeenCalledTimes(1);
		expect(note.deleteComment).not.toHaveBeenCalled();
	});

	it('hides it for a viewer', () => {
		mockPermissions = { canEdit: false, canComment: false };

		const { deleteItem } = renderMenu(
			createNode('thread-1', 'commentNode', 'me')
		);

		expect(deleteItem?.hidden).toBe(true);
	});
});
