import { fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { HistoryItem } from './history-item';

let mockStoreState: Record<string, unknown>;

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('../ui/button', () => ({
	Button: ({
		children,
		variant,
		size,
		...props
	}: ButtonHTMLAttributes<HTMLButtonElement> & {
		children: ReactNode;
		variant?: unknown;
		size?: unknown;
	}) => <button {...props}>{children}</button>,
}));

function createNode(id: string, content: string, position = { x: 0, y: 0 }) {
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
			metadata: { title: content },
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
		},
	};
}

function createStoreState(overrides: Record<string, unknown> = {}) {
	return {
		loadingStates: { isHistoryLoading: false },
		isReverting: false,
		revertingIndex: null,
		revertToHistoryState: jest.fn(),
		canRevertChange: jest.fn(() => true),
		currentUser: { id: 'user-1' },
		mapId: 'map-1',
		nodes: [createNode('node-1', 'Readable node')],
		edges: [],
		centerOnNode: jest.fn(),
		reactFlowInstance: {
			fitView: jest.fn(),
			setCenter: jest.fn(),
			updateNode: jest.fn(),
		},
		setSelectedNodes: jest.fn(),
		...overrides,
	};
}

describe('HistoryItem focus controls', () => {
	beforeEach(() => {
		mockStoreState = createStoreState();
		global.fetch = jest.fn();
	});

	it('focuses a changed node without closing the history item', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({
				operation: 'update',
				entityType: 'node',
				actionName: 'updateNode',
				userId: 'user-1',
				userName: 'You',
				timestamp: 1_775_000_000_000,
				changes: [
					{
						id: 'node-1',
						type: 'node',
						op: 'patch',
						patch: { 'data.content': 'Readable node updated' },
						reversePatch: { 'data.content': 'Readable node' },
					},
				],
			}),
		});

		render(
			<HistoryItem
				isCurrent={false}
				meta={{
					id: 'history-1',
					type: 'event',
					actionName: 'updateNode',
					timestamp: 1_775_000_000_000,
				}}
				originalIndex={0}
			/>
		);

		fireEvent.click(screen.getByText('Property edit'));

		const focusButton = await screen.findByRole('button', {
			name: 'Focus Readable node',
		});
		fireEvent.click(focusButton);

		expect(mockStoreState.centerOnNode).toHaveBeenCalledWith('node-1');
		expect(screen.getByText('Technical details')).toBeInTheDocument();
	});

	it('focuses connection endpoints for an edge history item', async () => {
		const fitView = jest.fn();
		const updateNode = jest.fn();
		const setSelectedNodes = jest.fn();
		mockStoreState = createStoreState({
			nodes: [createNode('source', 'Source'), createNode('target', 'Target')],
			edges: [
				{
					id: 'edge-1',
					source: 'source',
					target: 'target',
					type: 'waypointEdge',
					data: {
						id: 'edge-1',
						map_id: 'map-1',
						user_id: 'user-1',
						source: 'source',
						target: 'target',
					},
				},
			],
			reactFlowInstance: {
				fitView,
				setCenter: jest.fn(),
				updateNode,
			},
			setSelectedNodes,
		});
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({
				operation: 'add',
				entityType: 'edge',
				actionName: 'addEdge',
				userId: 'user-1',
				userName: 'You',
				timestamp: 1_775_000_000_000,
				changes: [
					{
						id: 'edge-1',
						type: 'edge',
						op: 'add',
						value: {
							id: 'edge-1',
							source: 'source',
							target: 'target',
							type: 'waypointEdge',
							data: {
								id: 'edge-1',
								map_id: 'map-1',
								user_id: 'user-1',
								source: 'source',
								target: 'target',
							},
						},
					},
				],
			}),
		});

		render(
			<HistoryItem
				isCurrent={false}
				meta={{
					id: 'history-2',
					type: 'event',
					actionName: 'addEdge',
					timestamp: 1_775_000_000_000,
				}}
				originalIndex={0}
			/>
		);

		fireEvent.click(screen.getByText('Connection change'));

		const focusButton = await screen.findByRole('button', {
			name: 'Focus Source -> Target',
		});
		fireEvent.click(focusButton);

		expect(fitView).toHaveBeenCalledWith({
			nodes: [{ id: 'source' }, { id: 'target' }],
			padding: 0.35,
			duration: 800,
		});
		expect(updateNode).toHaveBeenCalledWith('source', { selected: true });
		expect(updateNode).toHaveBeenCalledWith('target', { selected: true });
		expect(setSelectedNodes).toHaveBeenCalledWith(mockStoreState.nodes);
	});

	it('keeps raw coordinate paths behind technical details', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({
				operation: 'update',
				entityType: 'node',
				actionName: 'moveNodes',
				userId: 'user-1',
				userName: 'You',
				timestamp: 1_775_000_000_000,
				changes: [
					{
						id: 'node-1',
						type: 'node',
						op: 'patch',
						patch: {
							'position.x': 390,
							'position.y': 614,
						},
						reversePatch: {
							'position.x': 912,
							'position.y': 576,
						},
					},
				],
			}),
		});

		render(
			<HistoryItem
				isCurrent={false}
				meta={{
					id: 'history-3',
					type: 'event',
					actionName: 'moveNodes',
					timestamp: 1_775_000_000_000,
				}}
				originalIndex={0}
			/>
		);

		fireEvent.click(screen.getByText('Node movement'));

		expect((await screen.findAllByText('Node moved')).length).toBeGreaterThan(0);
		expect(screen.queryByText(/Position\.x/i)).not.toBeInTheDocument();

		fireEvent.click(screen.getByText('Technical details'));

		expect(await screen.findByText(/Position\.x/i)).toBeInTheDocument();
	});
});
