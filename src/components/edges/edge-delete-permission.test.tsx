import { fireEvent, render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import FloatingEdge from './floating-edge';
import WaypointEdge from './waypoint-edge';

const mockDeleteEdges = jest.fn();
let mockStoreState: Record<string, unknown>;

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('zustand/shallow', () => ({
	useShallow: <T,>(selector: T) => selector,
}));

jest.mock('@xyflow/react', () => ({
	BaseEdge: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
	EdgeLabelRenderer: ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	),
	getBezierPath: () => ['M0 0', 5, 5],
	getSmoothStepPath: () => ['M0 0', 5, 5],
	getStraightPath: () => ['M0 0', 5, 5],
	Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
	useInternalNode: () => ({
		internals: { positionAbsolute: { x: 0, y: 0 } },
		measured: { width: 100, height: 40 },
	}),
}));

jest.mock('@/helpers/get-floating-edge-path', () => ({
	getFloatingEdgePath: () => ({
		sourceX: 0,
		sourceY: 0,
		targetX: 10,
		targetY: 10,
		sourcePos: 'right',
		targetPos: 'left',
	}),
}));

jest.mock('@/helpers/get-anchor-position', () => ({
	createDefaultAnchor: (side: string) => ({ side }),
	getAnchorPosition: () => ({ x: 0, y: 0 }),
}));

jest.mock('@/helpers/get-waypoint-path', () => ({
	getWaypointPath: () => ({ path: 'M0 0 L10 10' }),
}));

jest.mock('./waypoint-edge-label-position', () => ({
	resolveWaypointEdgeLabelPosition: () => ({ labelX: 5, labelY: 5 }),
}));

jest.mock('../ui/button', () => ({
	Button: ({
		children,
		onClick,
		title,
	}: {
		children?: React.ReactNode;
		onClick?: React.MouseEventHandler;
		title?: string;
	}) => (
		<button onClick={onClick} title={title} type='button'>
			{children}
		</button>
	),
}));

function storeFor(role: 'owner' | 'viewer') {
	return {
		deleteEdges: mockDeleteEdges,
		currentUser: { id: 'user-1' },
		mindMap: { user_id: role === 'owner' ? 'user-1' : 'someone-else' },
		permissions: { can_edit: false },
	};
}

const edgeProps = {
	id: 'edge-1',
	source: 'a',
	target: 'b',
	selected: false,
	data: { label: 'relates to', metadata: {} },
} as unknown as EdgeProps<never>;

describe.each([
	['FloatingEdge', FloatingEdge],
	['WaypointEdge', WaypointEdge],
])('%s delete button', (_name, Edge) => {
	beforeEach(() => {
		mockDeleteEdges.mockClear();
	});

	it('deletes the edge for someone who can edit', () => {
		mockStoreState = storeFor('owner');
		render(<Edge {...edgeProps} />);

		fireEvent.click(screen.getByTitle('Delete connection'));

		expect(mockDeleteEdges).toHaveBeenCalledTimes(1);
	});

	it('is not rendered for someone who cannot edit, but the label still is', () => {
		mockStoreState = storeFor('viewer');
		render(<Edge {...edgeProps} />);

		expect(screen.queryByTitle('Delete connection')).not.toBeInTheDocument();
		expect(screen.getByText('relates to')).toBeInTheDocument();
	});
});
