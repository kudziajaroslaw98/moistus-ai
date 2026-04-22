import useAppStore from '@/store/mind-map-store';
import { render, screen } from '@testing-library/react';
import { Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import SuggestedConnectionEdge from './suggested-connection-edge';

const useInternalNodeMock = jest.fn();

jest.mock('@/helpers/get-floating-edge-path', () => ({
	getFloatingEdgePath: jest.fn(() => ({
		sourceX: 20,
		sourceY: 30,
		targetX: 220,
		targetY: 140,
		sourcePos: 'right',
		targetPos: 'left',
	})),
}));

jest.mock('@xyflow/react', () => ({
	BaseEdge: ({
		children,
		path,
	}: {
		children?: ReactNode;
		path?: string;
	}) => (
		<div data-testid='base-edge' data-path={path}>
			{children}
		</div>
	),
	EdgeLabelRenderer: ({ children }: { children?: ReactNode }) => (
		<>{children}</>
	),
	getBezierPath: jest.fn(() => ['M 0 0 L 1 1', 120, 60]),
	getSmoothStepPath: jest.fn(() => ['M 0 0 L 1 1', 120, 60]),
	getStraightPath: jest.fn(() => ['M 0 0 L 1 1', 120, 60]),
	Position: {
		Top: 'top',
		Bottom: 'bottom',
		Left: 'left',
		Right: 'right',
	},
	useInternalNode: (...args: unknown[]) => useInternalNodeMock(...args),
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockUseAppStore = useAppStore as unknown as jest.Mock;

const sourceNode = {
	id: 'source',
	measured: { width: 160, height: 80 },
	internals: { positionAbsolute: { x: 0, y: 0 } },
};
const targetNode = {
	id: 'target',
	measured: { width: 160, height: 80 },
	internals: { positionAbsolute: { x: 260, y: 60 } },
};

describe('SuggestedConnectionEdge', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAppStore.mockImplementation((selector) =>
			selector({
				acceptConnectionSuggestion: jest.fn(),
				rejectConnectionSuggestion: jest.fn(),
			})
		);
		useInternalNodeMock.mockImplementation((nodeId: string) => {
			if (nodeId === 'source') {
				return sourceNode;
			}
			if (nodeId === 'target') {
				return targetNode;
			}
			return undefined;
		});
	});

	it('renders collapsed-child indicator chip when proxy metadata exists', () => {
		render(
			<SuggestedConnectionEdge
				id='edge-1'
				source='source'
				target='target'
				sourceX={20}
				sourceY={30}
				targetX={220}
				targetY={140}
				sourcePosition={Position.Right}
				targetPosition={Position.Left}
				selected={false}
				style={{}}
				data={{
					id: 'edge-1',
					map_id: 'map-1',
					user_id: 'system',
					source: 'source',
					target: 'target',
					label: 'depends-on',
					style: { stroke: '#f59e0b', strokeWidth: 2 },
					metadata: { pathType: 'smoothstep' },
					aiData: {
						isSuggested: true,
						reason: 'AI suggested connection',
						connectionProxy: {
							originalSourceNodeId: 'hidden-child',
							originalTargetNodeId: 'target',
							displaySourceNodeId: 'source',
							displayTargetNodeId: 'target',
							sourceHiddenChildLabel: 'Hidden child node',
						},
					},
				}}
			/>
		);

		expect(
			screen.getByText('Collapsed child: Hidden child node')
		).toBeInTheDocument();
	});

	it('does not render collapsed-child indicator without proxy metadata', () => {
		render(
			<SuggestedConnectionEdge
				id='edge-1'
				source='source'
				target='target'
				sourceX={20}
				sourceY={30}
				targetX={220}
				targetY={140}
				sourcePosition={Position.Right}
				targetPosition={Position.Left}
				selected={false}
				style={{}}
				data={{
					id: 'edge-1',
					map_id: 'map-1',
					user_id: 'system',
					source: 'source',
					target: 'target',
					label: 'depends-on',
					style: { stroke: '#f59e0b', strokeWidth: 2 },
					metadata: { pathType: 'smoothstep' },
					aiData: {
						isSuggested: true,
						reason: 'AI suggested connection',
					},
				}}
			/>
		);

		expect(screen.queryByText(/^Collapsed child:/)).not.toBeInTheDocument();
	});

	it('renders self-loop suggestions when both display endpoints resolve to the same node', () => {
		useInternalNodeMock.mockImplementation((nodeId: string) => {
			if (nodeId === 'collapsed-parent') {
				return sourceNode;
			}
			return undefined;
		});

		render(
			<SuggestedConnectionEdge
				id='edge-loop'
				source='collapsed-parent'
				target='collapsed-parent'
				sourceX={20}
				sourceY={30}
				targetX={20}
				targetY={30}
				sourcePosition={Position.Right}
				targetPosition={Position.Right}
				selected={false}
				style={{}}
				data={{
					id: 'edge-loop',
					map_id: 'map-1',
					user_id: 'system',
					source: 'collapsed-parent',
					target: 'collapsed-parent',
					label: 'depends-on',
					style: { stroke: '#f59e0b', strokeWidth: 2 },
					metadata: { pathType: 'smoothstep' },
					aiData: {
						isSuggested: true,
						reason: 'AI suggested connection',
						connectionProxy: {
							originalSourceNodeId: 'hidden-a',
							originalTargetNodeId: 'hidden-b',
							displaySourceNodeId: 'collapsed-parent',
							displayTargetNodeId: 'collapsed-parent',
							sourceHiddenChildLabel: 'Hidden A',
							targetHiddenChildLabel: 'Hidden B',
						},
					},
				}}
			/>
		);

		const edge = screen.getByTestId('base-edge');
		expect(edge).toHaveAttribute('data-path');
		expect(edge.getAttribute('data-path')).toContain('C');
		expect(screen.getByText('Collapsed child: Hidden A')).toBeInTheDocument();
		expect(screen.getByText('Collapsed child: Hidden B')).toBeInTheDocument();
	});

	it('renders suggestion label wrappers with elevated z-index', () => {
		const { container } = render(
			<SuggestedConnectionEdge
				id='edge-z-index'
				source='source'
				target='target'
				sourceX={20}
				sourceY={30}
				targetX={220}
				targetY={140}
				sourcePosition={Position.Right}
				targetPosition={Position.Left}
				selected={false}
				style={{}}
				data={{
					id: 'edge-z-index',
					map_id: 'map-1',
					user_id: 'system',
					source: 'source',
					target: 'target',
					label: 'depends-on',
					style: { stroke: '#f59e0b', strokeWidth: 2 },
					metadata: { pathType: 'smoothstep' },
					aiData: {
						isSuggested: true,
						reason: 'AI suggested connection',
						connectionProxy: {
							originalSourceNodeId: 'hidden-child',
							originalTargetNodeId: 'target',
							displaySourceNodeId: 'source',
							displayTargetNodeId: 'target',
							sourceHiddenChildLabel: 'Hidden child node',
						},
					},
				}}
			/>
		);

		const wrappers = container.querySelectorAll('div[style*="z-index: 51000"]');
		expect(wrappers.length).toBeGreaterThanOrEqual(2);
	});
});
