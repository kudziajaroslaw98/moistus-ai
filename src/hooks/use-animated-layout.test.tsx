import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { act, renderHook } from '@testing-library/react';
import { useAnimatedLayout } from './use-animated-layout';

const createNode = (id: string, x: number, y: number): AppNode =>
	({
		id,
		type: 'defaultNode',
		position: { x, y },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: x,
			position_y: y,
			node_type: 'defaultNode',
			created_at: '2026-03-11T00:00:00.000Z',
			updated_at: '2026-03-11T00:00:00.000Z',
			metadata: {},
		},
	} as AppNode);

const createEdge = (
	id: string,
	source: string,
	target: string,
	waypointX: number
): AppEdge =>
	({
		id,
		source,
		target,
		type: 'waypointEdge',
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			label: null,
			animated: false,
			metadata: {
				pathType: 'waypoint',
				sourceAnchor: { side: 'right', offset: 0.5 },
				targetAnchor: { side: 'left', offset: 0.5 },
				waypoints: [{ id: `${id}:wp:0`, x: waypointX, y: 0 }],
			},
			aiData: {},
			created_at: '2026-03-11T00:00:00.000Z',
			updated_at: '2026-03-11T00:00:00.000Z',
		},
	} as AppEdge);

function createMatchMedia(matches: boolean) {
	return jest.fn().mockImplementation((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		addListener: jest.fn(),
		removeListener: jest.fn(),
		dispatchEvent: jest.fn(),
	}));
}

describe('useAnimatedLayout', () => {
	let frameQueue: FrameRequestCallback[] = [];

	beforeEach(() => {
		frameQueue = [];
		jest.spyOn(performance, 'now').mockReturnValue(0);
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: createMatchMedia(false),
		});
		Object.defineProperty(globalThis, 'requestAnimationFrame', {
			writable: true,
			value: jest.fn((callback: FrameRequestCallback) => {
				frameQueue.push(callback);
				return frameQueue.length;
			}),
		});
		Object.defineProperty(globalThis, 'cancelAnimationFrame', {
			writable: true,
			value: jest.fn(),
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('animates node positions and waypoint routes together', async () => {
		const onFrame = jest.fn();
		const { result } = renderHook(() => useAnimatedLayout());

		const currentNodes = [createNode('a', 0, 0), createNode('b', 200, 0)];
		const targetNodes = [createNode('a', 100, 0), createNode('b', 300, 0)];
		const currentEdges = [createEdge('edge-1', 'a', 'b', 50)];
		const targetEdges = [createEdge('edge-1', 'a', 'b', 150)];

		let finalGraph:
			| {
					nodes: AppNode[];
					edges: AppEdge[];
			  }
			| undefined;

		await act(async () => {
			const animationPromise = result.current.animateGraphToState({
				currentNodes,
				targetNodes,
				currentEdges,
				targetEdges,
				animatedNodeIds: ['a', 'b'],
				animatedEdgeIds: ['edge-1'],
				onFrame,
			});

			frameQueue.shift()?.(0);
			frameQueue.shift()?.(275);
			frameQueue.shift()?.(550);

			finalGraph = await animationPromise;
		});

		expect(onFrame).toHaveBeenCalledTimes(3);

		const midpointFrame = onFrame.mock.calls[1]?.[0];
		expect(midpointFrame.nodes[0].position.x).toBeGreaterThan(0);
		expect(midpointFrame.nodes[0].position.x).toBeLessThan(100);
		expect(
			midpointFrame.edges[0].data?.metadata?.waypoints?.[0]?.x ?? 0
		).toBeGreaterThan(50);
		expect(
			midpointFrame.edges[0].data?.metadata?.waypoints?.[0]?.x ?? 0
		).toBeLessThan(150);

		expect(finalGraph?.nodes[0].position).toEqual({ x: 100, y: 0 });
		expect(finalGraph?.edges[0].data?.metadata?.waypoints).toEqual([
			{ id: 'edge-1:wp:0', x: 150, y: 0 },
		]);
	});

	it('snaps immediately when reduced motion is enabled', async () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: createMatchMedia(true),
		});

		const { result } = renderHook(() => useAnimatedLayout());

		const finalGraph = await result.current.animateGraphToState({
			currentNodes: [createNode('a', 0, 0)],
			targetNodes: [createNode('a', 120, 0)],
			currentEdges: [createEdge('edge-1', 'a', 'b', 50)],
			targetEdges: [createEdge('edge-1', 'a', 'b', 150)],
		});

		expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
		expect(finalGraph.nodes[0].position).toEqual({ x: 120, y: 0 });
		expect(finalGraph.edges[0].data?.metadata?.waypoints).toEqual([
			{ id: 'edge-1:wp:0', x: 150, y: 0 },
		]);
	});
});
