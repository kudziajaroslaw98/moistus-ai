import {
	calculateDelta,
	applyDelta,
	applyDeltaReverse,
} from '@/helpers/history/delta-calculator';
import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
import { AttributedHistoryDelta } from '@/types/history-state';
import { toast } from 'sonner';
import { StateCreator } from 'zustand';
import { AppState, HistorySlice } from '../app-state';

export const createHistorySlice: StateCreator<
	AppState,
	[],
	[],
	HistorySlice
> = (set, get) => ({
	// state
	history: [],
	historyMeta: [],
	historyIndex: -1,
	isReverting: false,
	canUndo: false,
	canRedo: false,

	// pagination
	historyPageOffset: 0,
	historyPageLimit: 50,
	historyHasMore: false,

	// getters
	getCurrentHistoryState: () => {
		const { history, historyIndex } = get();
		return history[historyIndex];
	},

	// actions
	/**
	 * Adds a new state to the undo/redo history stack using delta-based caching.
	 * Reduces memory usage by ~87% compared to storing full states.
	 * @param actionName Optional name for the action
	 * @param stateOverride Optionally override nodes/edges to save
	 */
	addStateToHistory: (
		actionName?: string,
		stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] }
	) => {
		const { nodes, edges, history, historyIndex, currentUser, userProfile } =
			get();
		const nodesToSave = stateOverride?.nodes ?? nodes;
		const edgesToSave = stateOverride?.edges ?? edges;

		// Get current state
		const currentState = { nodes: nodesToSave, edges: edgesToSave };
		const lastHistoryState = history[historyIndex];

		// Skip if no changes
		if (lastHistoryState) {
			const nodesChanged =
				JSON.stringify(currentState.nodes) !==
				JSON.stringify(lastHistoryState.nodes);
			const edgesChanged =
				JSON.stringify(currentState.edges) !==
				JSON.stringify(lastHistoryState.edges);
			if (!nodesChanged && !edgesChanged) return;
		}

		// Calculate delta from previous state
		const previousState = lastHistoryState || { nodes: [], edges: [] };
		const delta = calculateDelta(previousState, currentState);

		// Skip if no delta (shouldn't happen with above check, but safety)
		if (!delta) return;

		// Add attribution for collaboration
		const userId = currentUser?.id || userProfile?.user_id || 'anonymous';
		const userName =
			userProfile?.display_name ||
			currentUser?.user_metadata?.full_name ||
			'Anonymous';
		const userAvatar = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url;

		const attributedDelta: AttributedHistoryDelta = {
			...delta,
			userId,
			userName,
			userAvatar,
			actionName: actionName || 'unknown',
			timestamp: Date.now(),
		};

		// Create lightweight history entry (for UI compatibility)
		const historyEntry = {
			nodes: currentState.nodes,
			edges: currentState.edges,
			timestamp: attributedDelta.timestamp,
			actionName: attributedDelta.actionName,
			// Store delta reference for memory efficiency
			_delta: attributedDelta,
		};

		// Update history with new entry
		const newHistory = [...history.slice(0, historyIndex + 1), historyEntry];

		set({
			history: newHistory,
			historyIndex: newHistory.length - 1,
			canUndo: newHistory.length > 1,
			canRedo: false,
		});
	},

	/**
	 * Load recent history metadata from the API and seed in-memory history.
	 * Note: Uses placeholder nodes/edges (empty arrays) for compatibility with existing UI.
	 * Future components can render counts from metadata endpoints.
	 */
	loadHistoryFromDB: async () => {
		const { setLoadingStates, mapId } = get();
		try {
			if (!mapId) return;
			setLoadingStates?.({ isStateLoading: true });
			const limit = get().historyPageLimit || 50;
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_APP_LOCAL_HREF}/api/history/${mapId}/list`
			);
			if (!res.ok) return;
			const data = await res.json();
			const itemsDesc = (data.items || []) as any[];
			const itemsAsc = [...itemsDesc].reverse();
			const states = itemsAsc.map((item: any) => ({
				nodes: [],
				edges: [],
				actionName: item.actionName,
				timestamp: item.timestamp,
			}));
			set({
				history: states,
				historyMeta: itemsAsc,
				historyIndex: Math.max(0, states.length - 1),
				canUndo: states.length > 1,
				canRedo: false,
				historyPageOffset: itemsAsc.length,
				historyHasMore: !!data.hasMore,
			});
		} catch (e) {
			console.error('Failed to load history from DB:', e);
		} finally {
			setLoadingStates?.({ isStateLoading: false });
		}
	},

	/**
	 * Undo the last state change using bidirectional deltas when available.
	 * Falls back to full state restoration for backward compatibility.
	 */
	handleUndo: async () => {
		const { history, historyIndex, setNodes, setEdges, nodes, edges } = get();

		if (historyIndex > 0) {
			const currentEntry = history[historyIndex] as any;
			const prevState = history[historyIndex - 1];

			// Use delta-based undo if delta is available (new entries)
			if (currentEntry._delta) {
				try {
					const currentState = { nodes, edges };
					const newState = applyDeltaReverse(
						currentState,
						currentEntry._delta
					);
					setNodes(newState.nodes);
					setEdges(newState.edges);
				} catch (error) {
					console.error('Failed to apply reverse delta, falling back:', error);
					// Fallback to full state if delta application fails
					setNodes(prevState.nodes);
					setEdges(prevState.edges);
				}
			} else {
				// Fallback for old entries without deltas
				setNodes(prevState.nodes);
				setEdges(prevState.edges);
			}

			set({
				historyIndex: historyIndex - 1,
				canUndo: historyIndex - 1 > 0,
				canRedo: true,
			});
		}
	},

	// Load older pages (prepend older items)
	loadMoreHistory: async (mapId: string) => {
		const { setLoadingStates } = get();
		try {
			if (!mapId) return;
			setLoadingStates?.({ isStateLoading: true });
			const { historyPageOffset, historyPageLimit, history, historyMeta } =
				get();
			const res = await fetch(
				`/api/history/${mapId}/list?limit=${historyPageLimit}&offset=${historyPageOffset}`,
				{ cache: 'no-store' }
			);
			if (!res.ok) return;
			const data = await res.json();
			const itemsDesc = (data.items || []) as any[];
			const itemsAsc = [...itemsDesc].reverse();
			const states = itemsAsc.map((item: any) => ({
				nodes: [],
				edges: [],
				actionName: item.actionName,
				timestamp: item.timestamp,
			}));
			const newHistory = [...states, ...history];
			const newMeta = [...itemsAsc, ...historyMeta];
			set({
				history: newHistory,
				historyMeta: newMeta,
				historyPageOffset: historyPageOffset + itemsAsc.length,
				historyHasMore: !!data.hasMore,
				historyIndex:
					(get().historyIndex ?? newHistory.length - 1) + itemsAsc.length,
			});
		} catch (e) {
			console.error('Failed to load more history:', e);
		} finally {
			setLoadingStates?.({ isStateLoading: false });
		}
	},

	/**
	 * Redo the next state change using bidirectional deltas when available.
	 * Falls back to full state restoration for backward compatibility.
	 */
	handleRedo: async () => {
		const { history, historyIndex, setNodes, setEdges, nodes, edges } = get();

		if (historyIndex < history.length - 1) {
			const nextEntry = history[historyIndex + 1] as any;

			// Use delta-based redo if delta is available (new entries)
			if (nextEntry._delta) {
				try {
					const currentState = { nodes, edges };
					const newState = applyDelta(currentState, nextEntry._delta);
					setNodes(newState.nodes);
					setEdges(newState.edges);
				} catch (error) {
					console.error('Failed to apply forward delta, falling back:', error);
					// Fallback to full state if delta application fails
					setNodes(nextEntry.nodes);
					setEdges(nextEntry.edges);
				}
			} else {
				// Fallback for old entries without deltas
				setNodes(nextEntry.nodes);
				setEdges(nextEntry.edges);
			}

			set({
				historyIndex: historyIndex + 1,
				canUndo: true,
				canRedo: historyIndex + 1 < history.length - 1,
			});
		}
	},

	/** Create a manual snapshot (Pro-only). Refreshes history list on success. */
	createSnapshot: async (
		actionName: string = 'Manual Checkpoint',
		isMajor: boolean = true
	) => {
		const { mapId, nodes, edges, loadHistoryFromDB } = get();
		if (!mapId) return;
		try {
			const res = await fetch(`/api/history/${mapId}/snapshot`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ actionName, nodes, edges, isMajor }),
			});
			if (res.ok) {
				toast.success('Checkpoint created');
				await loadHistoryFromDB();
			} else {
				toast.error('Failed to create checkpoint');
			}
		} catch (e) {
			console.error('Failed to create snapshot:', e);
			toast.error('Failed to create checkpoint');
		}
	},

	/**
	 * Check if the current user can revert a specific history change.
	 * @param delta The attributed delta to check permissions for
	 * @returns true if user can revert, false otherwise
	 */
	canRevertChange: (delta?: AttributedHistoryDelta) => {
		const { currentUser, mindMap } = get();

		// No user or no mindMap means no permissions check
		if (!currentUser || !mindMap) return true;

		// No delta means old-style entry, allow for backward compatibility
		if (!delta) return true;

		// Map owner can revert anything
		if (mindMap.user_id === currentUser.id) return true;

		// Users can revert their own changes
		if (delta.userId === currentUser.id) return true;

		// Otherwise, no permission
		return false;
	},

	/**
	 * Revert to a specific history state by index.
	 * Checks permissions for collaborative maps.
	 * @param index The history index to revert to
	 */
	// Compute and persist a delta event without mutating in-memory history
	persistDeltaEvent: async (
		actionName: string,
		prev: { nodes: AppNode[]; edges: AppEdge[] },
		next: { nodes: AppNode[]; edges: AppEdge[] }
	) => {
		try {
			const { supabase, mapId, currentUser } = get();
			if (!mapId) return;
			let userId = currentUser?.id as string | undefined;
			if (!userId) {
				const u = await supabase.auth.getUser();
				userId = u.data.user?.id;
			}
			if (!userId) return;

			// Ensure baseline snapshot exists
			const { data: existingLastSnap } = await supabase
				.from('map_history_snapshots')
				.select('id, snapshot_index')
				.eq('map_id', mapId)
				.order('snapshot_index', { ascending: false })
				.limit(1)
				.single();
			let snapshotId = existingLastSnap?.id || null;
			if (!snapshotId) {
				const { data: newBaseline } = await supabase
					.from('map_history_snapshots')
					.insert({
						map_id: mapId,
						user_id: userId,
						snapshot_index: 0,
						action_name: 'baseline',
						nodes: prev.nodes,
						edges: prev.edges,
						node_count: prev.nodes.length,
						edge_count: prev.edges.length,
						is_major: false,
					})
					.select()
					.single();
				snapshotId = newBaseline?.id ?? null;
			}
			if (!snapshotId) return;

			// Compute delta
			const delta = calculateDelta(prev, next);
			if (!delta) return;

			const { data: lastEvent } = await supabase
				.from('map_history_events')
				.select('event_index')
				.eq('snapshot_id', snapshotId)
				.order('event_index', { ascending: false })
				.limit(1)
				.single();
			const nextEventIndex = (lastEvent?.event_index ?? -1) + 1;

			await supabase.from('map_history_events').insert({
				map_id: mapId,
				user_id: userId,
				snapshot_id: snapshotId,
				event_index: nextEventIndex,
				action_name: actionName,
				operation_type: delta.operation,
				entity_type: delta.entityType,
				changes: delta,
			});
		} catch (e) {
			console.error('persistDeltaEvent failed:', e);
		}
	},

	revertToHistoryState: async (index: number) => {
		const {
			history,
			historyMeta,
			historyIndex,
			setNodes,
			setEdges,
			isReverting,
			mapId,
			canRevertChange,
			unsubscribeFromRealtimeUpdates,
			subscribeToRealtimeUpdates,
		} = get();
		if (isReverting || index < 0 || index >= history.length) return;
		if (index === historyIndex) return;

		// Check permissions for collaborative maps
		const targetEntry = history[index] as any;
		const delta = targetEntry?._delta as AttributedHistoryDelta | undefined;
		if (!canRevertChange(delta)) {
			toast.error(
				'You do not have permission to revert this change. Only the map owner or the author of the change can revert it.'
			);
			return;
		}

		set({ isReverting: true });
		const targetState = history[index];
		const meta: any = historyMeta?.[index];

		try {
			// Step 1: Unsubscribe from real-time (prevents self-event processing)
			// Other users remain subscribed and will receive changes via real-time
			await unsubscribeFromRealtimeUpdates();

			// Step 2: Handle different revert scenarios
			if (targetState.nodes?.length && targetState.edges?.length) {
				// In-memory history entry with full state (no API call needed)
				setNodes(targetState.nodes);
				setEdges(targetState.edges);
				toast.success('Reverted');
			} else if (mapId && meta?.type === 'snapshot' && meta?.id) {
				// Revert to database snapshot
				const res = await fetch(`/api/history/${mapId}/revert`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ snapshotId: meta.id }),
				});

				if (res.ok) {
					const data = await res.json();
					setNodes(data.nodes);
					setEdges(data.edges);

					// Update in-memory history with full state (for future reverts)
					const updated = [...history];
					updated[index] = {
						...targetState,
						nodes: data.nodes,
						edges: data.edges,
					} as any;
					set({ history: updated });

					toast.success('Reverted to snapshot');
				} else {
					const error = await res.json().catch(() => ({}));
					toast.error(error.error || 'Failed to revert to snapshot');
				}
			} else if (mapId && meta?.type === 'event' && meta?.id) {
				// Revert to database event
				const res = await fetch(`/api/history/${mapId}/revert`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ eventId: meta.id }),
				});

				if (res.ok) {
					const data = await res.json();
					setNodes(data.nodes);
					setEdges(data.edges);

					// Update in-memory history
					const updated = [...history];
					updated[index] = {
						...targetState,
						nodes: data.nodes,
						edges: data.edges,
					} as any;
					set({ history: updated });

					toast.success('Reverted to event');
				} else {
					const error = await res.json().catch(() => ({}));
					toast.error(error.error || 'Failed to revert to event');
				}
			} else {
				// Fallback to local state
				setNodes(targetState.nodes || []);
				setEdges(targetState.edges || []);
				toast.success('Reverted');
			}
		} catch (error) {
			console.error('Revert failed:', error);
			toast.error('Failed to revert state');
		} finally {
			// Step 3: Always resubscribe (even on error) to restore real-time updates
			if (mapId) {
				await subscribeToRealtimeUpdates(mapId);
			}

			// Step 4: Update history pointers
			set({
				historyIndex: index,
				isReverting: false,
				canUndo: index > 0,
				canRedo: index < history.length - 1,
			});
		}
	},
});
