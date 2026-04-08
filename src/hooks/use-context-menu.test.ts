import { act, renderHook } from '@testing-library/react';
import { useContextMenu } from './use-context-menu';

let mockStoreState: Record<string, unknown>;

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('zustand/shallow', () => ({
	useShallow: <T,>(selector: T) => selector,
}));

describe('useContextMenu', () => {
	const setPopoverOpen = jest.fn();
	const setContextMenuState = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		mockStoreState = {
			reactFlowInstance: null,
			contextMenuState: {
				x: 0,
				y: 0,
				nodeId: null,
				edgeId: null,
			},
			popoverOpen: {
				contextMenu: false,
			},
			setPopoverOpen,
			setContextMenuState,
			activeTool: 'default',
			setActiveTool: jest.fn(),
			addNode: jest.fn(),
			deleteNodes: jest.fn(),
			isCommentMode: false,
			createComment: jest.fn(),
			mapId: 'map-1',
			currentUser: { id: 'user-1' },
			handleOnboardingCanvasNodeCreated: jest.fn(),
		};
	});

	it('openContextMenuAt opens the menu and sets coordinates/targets', () => {
		const { result } = renderHook(() => useContextMenu());

		act(() => {
			result.current.contextMenuHandlers.openContextMenuAt({
				x: 144,
				y: 233,
				nodeId: 'node-7',
			});
		});

		expect(setPopoverOpen).toHaveBeenCalledWith({ contextMenu: true });
		expect(setContextMenuState).toHaveBeenCalledWith({
			x: 144,
			y: 233,
			nodeId: 'node-7',
			edgeId: null,
		});
	});
});
