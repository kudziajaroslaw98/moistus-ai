import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MindMapCanvas } from './mind-map-canvas';

const mockUseKeyboardShortcuts = jest.fn();
const mockUseKeyboardNavigation = jest.fn();
const mockClearMindMapRuntimeState = jest.fn();
const mockSetMapId = jest.fn();
const mockFetchMindMapData = jest.fn();
let mockRouteMapId = 'map-new';
let mockStoreState: Record<string, unknown>;
let lastReactFlowAreaProps: Record<string, unknown> | null = null;

jest.mock('@/hooks/use-keyboard-navigation', () => ({
	useKeyboardNavigation: (...args: unknown[]) => mockUseKeyboardNavigation(...args),
}));

jest.mock('@/hooks/use-keyboard-shortcuts', () => ({
	useKeyboardShortcuts: (...args: unknown[]) => mockUseKeyboardShortcuts(...args),
}));

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => ({ canEdit: true }),
}));

jest.mock('@/hooks/realtime/use-realtime-selection-presence-room', () => ({
	useRealtimeSelectionPresenceRoom: jest.fn(),
}));

jest.mock('@/hooks/use-auth-redirect', () => ({
	useAuthRedirect: () => ({ isChecking: false }),
}));

jest.mock('@/lib/realtime/room-names', () => ({
	getMindMapRoomName: () => 'room:map',
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('next/navigation', () => ({
	useParams: () => ({ id: mockRouteMapId }),
	useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('zustand/react/shallow', () => ({
	useShallow: <T,>(selector: T) => selector,
}));

jest.mock('./mind-map/react-flow-area', () => ({
	ReactFlowArea: (props: Record<string, unknown>) => {
		lastReactFlowAreaProps = props;
		return <div data-testid='react-flow-area' />;
	},
}));

jest.mock('./mind-map/modals-wrapper', () => ({
	ModalsWrapper: () => null,
}));

jest.mock('./node-editor/node-editor', () => () => null);
jest.mock('./ai/ai-stream-mediator', () => ({
	AIStreamMediator: () => null,
}));
jest.mock('./mind-map/context-menu-wrapper', () => ({
	ContextMenuWrapper: () => null,
}));
jest.mock('./streaming-toast', () => ({
	StreamingToast: () => null,
}));
jest.mock('./auth/anonymous-user-banner', () => ({
	AnonymousUserBanner: () => null,
}));
jest.mock('./auth/upgrade-anonymous', () => ({
	UpgradeAnonymousPrompt: () => null,
}));
jest.mock('./mind-map/access-revoked-page', () => ({
	AccessRevokedPage: () => <div data-testid='access-revoked-page' />,
}));

function createStoreState(overrides: Record<string, unknown> = {}) {
	return {
		copySelectedNodes: jest.fn(),
		pasteNodes: jest.fn(),
		edges: [],
		selectedNodes: [],
		loadingStates: {
			isStateLoading: false,
		},
		isFocusMode: false,
		createGroupFromSelected: jest.fn(),
		ungroupNodes: jest.fn(),
		toggleNodeCollapse: jest.fn(),
		openNodeEditor: jest.fn(),
		currentUser: { id: 'user-1' },
		getCurrentUser: jest.fn(),
		userProfile: null,
		mapAccessError: null,
		mindMap: {
			id: 'map-old',
			title: 'Old',
			user_id: 'user-1',
		},
		mapId: 'map-old',
		setMapId: mockSetMapId,
		fetchMindMapData: mockFetchMindMapData,
		clearMindMapRuntimeState: mockClearMindMapRuntimeState,
		applyLayout: jest.fn(),
		flushPendingNodeSaves: jest.fn(),
		flushPendingEdgeSaves: jest.fn(),
		...overrides,
	};
}

describe('MindMapCanvas', () => {
	beforeEach(() => {
		mockRouteMapId = 'map-new';
		lastReactFlowAreaProps = null;
		mockClearMindMapRuntimeState.mockReset();
		mockSetMapId.mockReset();
		mockFetchMindMapData.mockReset();
		mockUseKeyboardShortcuts.mockReset();
		mockUseKeyboardNavigation.mockReset();
		mockStoreState = createStoreState();
	});

	it('starts map fetch for the requested route while the shell is visible', async () => {
		render(<MindMapCanvas />);

		await waitFor(() => {
			expect(mockSetMapId).toHaveBeenCalledWith('map-new');
			expect(mockFetchMindMapData).toHaveBeenCalledWith('map-new');
		});
	});

	it('renders the real shell and keeps map content gated when route id and store map do not match', () => {
		render(<MindMapCanvas />);

		expect(screen.getByTestId('react-flow-area')).toBeInTheDocument();
		expect(lastReactFlowAreaProps).toEqual(
			expect.objectContaining({ isMapReady: false })
		);
	});

	it('renders map content when the requested map is loaded in store', () => {
		mockStoreState = createStoreState({
			mapId: 'map-new',
			mindMap: {
				id: 'map-new',
				title: 'New Map',
				user_id: 'user-1',
			},
		});

		render(<MindMapCanvas />);

		expect(screen.getByTestId('react-flow-area')).toBeInTheDocument();
		expect(lastReactFlowAreaProps).toEqual(
			expect.objectContaining({ isMapReady: true })
		);
	});

	it('clears map runtime state on unmount', () => {
		const { unmount } = render(<MindMapCanvas />);

		unmount();

		return waitFor(() => {
			expect(mockClearMindMapRuntimeState).toHaveBeenCalledTimes(1);
		});
	});

	it('does not clear runtime state during Strict Mode effect replay', async () => {
		render(
			<StrictMode>
				<MindMapCanvas />
			</StrictMode>
		);

		await Promise.resolve();

		expect(mockClearMindMapRuntimeState).not.toHaveBeenCalled();
	});
});
