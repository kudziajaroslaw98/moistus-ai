import { act, renderHook } from '@testing-library/react';
import { useContextMenu } from './use-context-menu';

let mockStoreState: Record<string, unknown>;

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: Object.assign(
		(selector: (state: Record<string, unknown>) => unknown) =>
			selector(mockStoreState),
		{ getState: () => ({ nodes: [] }) }
	),
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
	it.each(['collapsed-proxy:a->b', 'annotation-tether:note-1'])(
		'ignores display-only edge %s',
		(edgeId) => {
			const { result } = renderHook(() => useContextMenu());

			act(() => {
				result.current.contextMenuHandlers.openContextMenuAt({ x: 1, y: 2, edgeId });
			});

			expect(setPopoverOpen).not.toHaveBeenCalled();
			expect(setContextMenuState).not.toHaveBeenCalled();
		}
	);

	describe('double-clicking the pane in comment mode', () => {
		const paneClick = { clientX: 40, clientY: 60 } as never;

		async function doubleClick() {
			const { result } = renderHook(() => useContextMenu());

			await act(async () => {
				await result.current.contextMenuHandlers.onPaneClick(paneClick);
				await result.current.contextMenuHandlers.onPaneClick(paneClick);
			});
		}

		beforeEach(() => {
			mockStoreState = {
				...mockStoreState,
				isCommentMode: true,
				reactFlowInstance: {
					screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
				},
				addNode: jest.fn().mockResolvedValue(undefined),
			};
		});

		it('starts a comment thread in Select', async () => {
			await doubleClick();

			expect(mockStoreState.addNode).toHaveBeenCalledWith(
				expect.objectContaining({ nodeType: 'commentNode' })
			);
		});

		it('does nothing in Pan', async () => {
			mockStoreState = { ...mockStoreState, activeTool: 'pan' };

			await doubleClick();

			expect(mockStoreState.addNode).not.toHaveBeenCalled();
		});
	});
});
