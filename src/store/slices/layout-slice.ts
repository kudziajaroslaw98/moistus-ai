/**
 * Layout Slice
 * Manages ELK.js-based automatic layout state and actions
 */

import { runElkLayout } from '@/helpers/layout/elk-worker-client';
import {
	applyLocalCreateBranchReflow,
	applyLocalEditBranchReflow,
} from '@/helpers/layout/local-branch-reflow';
import { rerouteAutoWaypointEdges } from '@/helpers/route-auto-waypoint-edges';
import {
	BROADCAST_EVENTS,
	broadcast,
	replaceGraphState,
} from '@/lib/realtime/broadcast-channel';
import {
	getEdgeActorId,
	getNodeActorId,
	serializeEdgeForRealtime,
	serializeNodeForRealtime,
	toPgReal,
} from '@/lib/realtime/graph-sync';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import {
	DEFAULT_LAYOUT_CONFIG,
	type LayoutAnimationReason,
	type LayoutConfig,
	type LayoutDirection,
	type LayoutSlice,
} from '@/types/layout-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

const pendingLocalResizeNodeIds = new Set<string>();
const pendingLocalResizeExpiryTimeouts = new Map<
	string,
	ReturnType<typeof setTimeout>
>();
const LOCAL_RESIZE_QUEUE_EXPIRY_MS = 1500;

function clearPendingLocalResizeExpiry(nodeId: string): void {
	const timeout = pendingLocalResizeExpiryTimeouts.get(nodeId);
	if (!timeout) {
		return;
	}

	clearTimeout(timeout);
	pendingLocalResizeExpiryTimeouts.delete(nodeId);
}

function schedulePendingLocalResizeExpiry(nodeId: string): void {
	clearPendingLocalResizeExpiry(nodeId);
	const timeout = setTimeout(() => {
		pendingLocalResizeNodeIds.delete(nodeId);
		pendingLocalResizeExpiryTimeouts.delete(nodeId);
	}, LOCAL_RESIZE_QUEUE_EXPIRY_MS);
	pendingLocalResizeExpiryTimeouts.set(nodeId, timeout);
}

type LayoutSet = Parameters<StateCreator<AppState, [], [], LayoutSlice>>[0];
type LayoutGet = Parameters<StateCreator<AppState, [], [], LayoutSlice>>[1];

function setLayoutAnimationSignal(
	set: LayoutSet,
	reason: LayoutAnimationReason,
	nodeIds: Iterable<string>,
	edgeIds: Iterable<string>
): void {
	set((state) => ({
		layoutAnimationVersion: state.layoutAnimationVersion + 1,
		layoutAnimationReason: reason,
		animatedNodeIds: Array.from(new Set(nodeIds)),
		animatedEdgeIds: Array.from(new Set(edgeIds)),
	}));
}

/**
 * Batch update node positions in database (single DB call)
 */
async function batchUpdateNodePositions(
	nodes: AppNode[],
	supabase: SupabaseClient,
	mapId: string
): Promise<void> {
	if (nodes.length === 0) return;

	const updates = nodes.map((node) => ({
		id: node.id,
		map_id: mapId,
		position_x: toPgReal(node.position.x),
		position_y: toPgReal(node.position.y),
		updated_at: new Date().toISOString(),
	}));

	const { error } = await supabase
		.from('nodes')
		.upsert(updates, { onConflict: 'id' });

	if (error) {
		console.error('Failed to batch update node positions:', error);
		throw error;
	}
}

/**
 * Batch update edge metadata in database (single DB call)
 */
async function batchUpdateEdgeMetadata(
	edges: AppEdge[],
	supabase: SupabaseClient,
	mapId: string
): Promise<void> {
	if (edges.length === 0) return;

	const updates = edges.map((edge) => ({
		id: edge.id,
		map_id: mapId,
		metadata: edge.data?.metadata ?? null,
		updated_at: new Date().toISOString(),
	}));

	const { error } = await supabase
		.from('edges')
		.upsert(updates, { onConflict: 'id' });

	if (error) {
		console.error('Failed to batch update edge metadata:', error);
		throw error;
	}
}

export const createLayoutSlice: StateCreator<AppState, [], [], LayoutSlice> = (
	set,
	get
) => ({
	layoutConfig: DEFAULT_LAYOUT_CONFIG,
	isLayouting: false,
	layoutError: null,
	lastLayoutTimestamp: 0,
	layoutAnimationVersion: 0,
	layoutAnimationReason: null,
	animatedNodeIds: [],
	animatedEdgeIds: [],

	setLayoutConfig: (config: Partial<LayoutConfig>) => {
		set((state) => ({
			layoutConfig: { ...state.layoutConfig, ...config },
		}));
	},

	applyLayout: async (direction?: LayoutDirection) => {
		const {
			nodes,
			edges,
			setMindMapContent,
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			supabase,
			mapId,
			currentUser,
		} = get();

		if (isLayouting) {
			toast.info('Layout already in progress...');
			return;
		}

		if (nodes.length === 0) {
			toast.info('No nodes to layout');
			return;
		}

		const prevNodes = [...nodes];
		const prevEdges = [...edges];
		const effectiveConfig: LayoutConfig = {
			...layoutConfig,
			direction: direction ?? layoutConfig.direction,
		};

		set({ isLayouting: true, layoutError: null });
		setLoadingStates?.({ isStateLoading: true });

		const toastId = toast.loading(
			`Applying ${getDirectionLabel(effectiveConfig.direction)} layout...`
		);

		try {
			const result = await runElkLayout({
				nodes,
				edges,
				config: effectiveConfig,
			});

			setMindMapContent({ nodes: result.nodes, edges: result.edges });
			if (effectiveConfig.animateTransition) {
				setLayoutAnimationSignal(
					set,
					'full',
					result.nodes.map((node) => node.id),
					result.edges.map((edge) => edge.id)
				);
			}

			if (mapId) {
				await replaceGraphState(mapId, {
					event: 'layout:apply',
					actorId: currentUser?.id ?? null,
					nodes: result.nodes.map((node) => {
						const actorId = getNodeActorId(node, currentUser?.id);
						return serializeNodeForRealtime(node, mapId, actorId);
					}),
					edges: result.edges
						.map((edge) => {
							const actorId = getEdgeActorId(edge, currentUser?.id);
							return serializeEdgeForRealtime(edge, mapId, actorId);
						})
						.filter((edge): edge is Record<string, unknown> => edge !== null),
				});

				if (supabase) {
					await Promise.all([
						batchUpdateNodePositions(result.nodes, supabase, mapId),
						batchUpdateEdgeMetadata(result.edges, supabase, mapId),
					]);
				}
			}

			await persistDeltaEvent(
				'applyLayout',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: result.nodes, edges: result.edges }
			);

			if (direction && direction !== layoutConfig.direction) {
				set((state) => ({
					layoutConfig: { ...state.layoutConfig, direction },
					mindMap: state.mindMap
						? { ...state.mindMap, layout_direction: direction }
						: state.mindMap,
				}));

				if (mapId) {
					try {
						const updatedMindMap = await persistLayoutDirection(
							mapId,
							direction
						);
						if (updatedMindMap) {
							set((state) => ({
								mindMap: updatedMindMap,
								layoutConfig: {
									...state.layoutConfig,
									direction: updatedMindMap.layout_direction ?? direction,
								},
							}));
						}
					} catch (error) {
						console.warn('Failed to persist layout direction:', error);
					}
				}
			}

			set({ lastLayoutTimestamp: Date.now() });
			toast.success('Layout applied successfully', { id: toastId });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Layout failed';
			set({ layoutError: errorMessage });
			toast.error(errorMessage, { id: toastId });
			console.error('Layout error:', error);
		} finally {
			set({ isLayouting: false });
			setLoadingStates?.({ isStateLoading: false });
		}
	},

	applyLayoutToSelected: async () => {
		const {
			nodes,
			edges,
			setMindMapContent,
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			selectedNodes,
			supabase,
			mapId,
			currentUser,
		} = get();

		if (isLayouting) {
			toast.info('Layout already in progress...');
			return;
		}

		if (selectedNodes.length < 2) {
			toast.info('Select at least 2 nodes to layout');
			return;
		}

		const prevNodes = [...nodes];
		const prevEdges = [...edges];
		const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));

		set({ isLayouting: true, layoutError: null });
		setLoadingStates?.({ isStateLoading: true });

		const toastId = toast.loading(
			`Applying layout to ${selectedNodes.length} selected nodes...`
		);

		try {
			const result = await runElkLayout({
				nodes,
				edges,
				config: layoutConfig,
				selectedNodeIds,
			});

			setMindMapContent({ nodes: result.nodes, edges: result.edges });
			if (layoutConfig.animateTransition) {
				setLayoutAnimationSignal(
					set,
					'full',
					selectedNodeIds,
					result.edges
						.filter(
							(edge) =>
								selectedNodeIds.has(edge.source) &&
								selectedNodeIds.has(edge.target)
						)
						.map((edge) => edge.id)
				);
			}

			if (mapId) {
				await replaceGraphState(mapId, {
					event: 'layout:apply-selected',
					actorId: currentUser?.id ?? null,
					nodes: result.nodes.map((node) => {
						const actorId = getNodeActorId(node, currentUser?.id);
						return serializeNodeForRealtime(node, mapId, actorId);
					}),
					edges: result.edges
						.map((edge) => {
							const actorId = getEdgeActorId(edge, currentUser?.id);
							return serializeEdgeForRealtime(edge, mapId, actorId);
						})
						.filter((edge): edge is Record<string, unknown> => edge !== null),
				});

				if (supabase) {
					const affectedNodes = result.nodes.filter((node) =>
						selectedNodeIds.has(node.id)
					);
					const affectedEdges = result.edges.filter(
						(edge) =>
							selectedNodeIds.has(edge.source) &&
							selectedNodeIds.has(edge.target)
					);

					await Promise.all([
						batchUpdateNodePositions(affectedNodes, supabase, mapId),
						batchUpdateEdgeMetadata(affectedEdges, supabase, mapId),
					]);
				}
			}

			await persistDeltaEvent(
				'applyLayoutToSelected',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: result.nodes, edges: result.edges }
			);

			set({ lastLayoutTimestamp: Date.now() });
			toast.success(`Layout applied to ${selectedNodes.length} nodes`, {
				id: toastId,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Layout failed';
			set({ layoutError: errorMessage });
			toast.error(errorMessage, { id: toastId });
			console.error('Layout error:', error);
		} finally {
			set({ isLayouting: false });
			setLoadingStates?.({ isStateLoading: false });
		}
	},

	applyLayoutAroundNode: async (nodeId) => {
		await runLocalBranchReflow({
			mode: 'create',
			nodeId,
			set,
			get,
		});
	},

	queueLocalLayoutOnResize: (nodeId) => {
		pendingLocalResizeNodeIds.add(nodeId);
		schedulePendingLocalResizeExpiry(nodeId);
	},

	clearQueuedLocalLayoutOnResize: (nodeId) => {
		pendingLocalResizeNodeIds.delete(nodeId);
		clearPendingLocalResizeExpiry(nodeId);
	},

	runQueuedLocalLayoutOnResize: async (nodeId) => {
		if (!pendingLocalResizeNodeIds.has(nodeId)) {
			return;
		}

		const handled = await runLocalBranchReflow({
			mode: 'edit',
			nodeId,
			set,
			get,
		});

		if (handled) {
			pendingLocalResizeNodeIds.delete(nodeId);
			clearPendingLocalResizeExpiry(nodeId);
		}
	},

	resetLayoutConfig: () => {
		set({ layoutConfig: DEFAULT_LAYOUT_CONFIG });
	},
});

async function runLocalBranchReflow({
	mode,
	nodeId,
	set,
	get,
}: {
	mode: 'create' | 'edit';
	nodeId: string;
	set: LayoutSet;
	get: LayoutGet;
}): Promise<boolean> {
	const {
		nodes,
		edges,
		setMindMapContent,
		persistDeltaEvent,
		layoutConfig,
		isLayouting,
		setLoadingStates,
		mapId,
		currentUser,
		mindMap,
		markNodeAsSystemUpdate,
		permissions,
		supabase,
	} = get();

	const canEdit =
		mindMap?.user_id === currentUser?.id || Boolean(permissions?.can_edit);

	if (!canEdit || isLayouting) {
		return false;
	}

	const result =
		mode === 'create'
			? applyLocalCreateBranchReflow({
					changedNodeId: nodeId,
					nodes,
					edges,
					config: layoutConfig,
				})
			: applyLocalEditBranchReflow({
					changedNodeId: nodeId,
					nodes,
					edges,
					config: layoutConfig,
				});
	const rerouteNodeIds = new Set(result.affectedNodeIds);
	rerouteNodeIds.add(nodeId);
	const reroutedEdgesResult = rerouteAutoWaypointEdges({
		nodes: result.nodes,
		edges: result.edges,
		direction: layoutConfig.direction,
		connectedNodeIds: rerouteNodeIds,
	});
	const nextEdges = reroutedEdgesResult.edges;
	const affectedEdgeIds = new Set([
		...result.affectedEdgeIds,
		...reroutedEdgesResult.affectedEdgeIds,
	]);

	if (result.affectedNodeIds.size === 0 && affectedEdgeIds.size === 0) {
		return true;
	}

	const prevNodes = [...nodes];
	const prevEdges = [...edges];
	const affectedNodes = result.nodes.filter((node) =>
		result.affectedNodeIds.has(node.id)
	);
	const affectedEdges = nextEdges.filter((edge) =>
		affectedEdgeIds.has(edge.id)
	);

	set({ isLayouting: true, layoutError: null });
	setLoadingStates?.({ isStateLoading: true });

	try {
		setMindMapContent({ nodes: result.nodes, edges: nextEdges });
		if (layoutConfig.animateTransition) {
			setLayoutAnimationSignal(
				set,
				'local',
				result.affectedNodeIds,
				affectedEdgeIds
			);
		}

		if (mapId && currentUser) {
			for (const node of affectedNodes) {
				const actorId = getNodeActorId(node, currentUser.id);
				const nodeData = serializeNodeForRealtime(node, mapId, actorId);
				markNodeAsSystemUpdate(node.id);
				void broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
					id: node.id,
					data: nodeData,
					userId: actorId,
					timestamp: Date.now(),
				});
			}

			for (const edge of affectedEdges) {
				const actorId = getEdgeActorId(edge, currentUser.id);
				const edgeData = serializeEdgeForRealtime(edge, mapId, actorId);
				if (edgeData) {
					markNodeAsSystemUpdate(edge.source);
					markNodeAsSystemUpdate(edge.target);
					void broadcast(mapId, BROADCAST_EVENTS.EDGE_UPDATE, {
						id: edge.id,
						data: edgeData,
						userId: actorId,
						timestamp: Date.now(),
					});
				}
			}
		}

		if (mapId && supabase) {
			await Promise.all([
				batchUpdateNodePositions(affectedNodes, supabase, mapId),
				batchUpdateEdgeMetadata(affectedEdges, supabase, mapId),
			]);
		}

		await persistDeltaEvent(
			mode === 'create' ? 'applyLayoutAroundNode' : 'applyLocalResizeReflow',
			{ nodes: prevNodes, edges: prevEdges },
			{ nodes: result.nodes, edges: nextEdges }
		);

		set({ lastLayoutTimestamp: Date.now() });
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Local layout failed';
		set({ layoutError: errorMessage });
		toast.error(errorMessage);
		console.error('Local layout error:', error);
	} finally {
		set({ isLayouting: false });
		setLoadingStates?.({ isStateLoading: false });
	}

	return true;
}

async function persistLayoutDirection(
	mapId: string,
	direction: LayoutDirection
): Promise<AppState['mindMap'] | undefined> {
	const response = await fetch(`/api/maps/${mapId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ layout_direction: direction }),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(errorBody || 'Failed to persist layout direction');
	}

	const result = (await response.json()) as {
		data?: { map?: AppState['mindMap'] };
	};

	return result.data?.map;
}

function getDirectionLabel(direction: LayoutDirection): string {
	const labels: Record<LayoutDirection, string> = {
		LEFT_RIGHT: 'Left to Right',
		TOP_BOTTOM: 'Top to Bottom',
	};

	return labels[direction];
}
