import { calculateDelta } from '@/helpers/history/delta-calculator';
import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
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
	 * Adds a new state to the undo/redo history stack. Avoids consecutive duplicates.
	 * @param actionName Optional name for the action
	 * @param stateOverride Optionally override nodes/edges to save
	 */
	addStateToHistory: (
		actionName?: string,
		stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] }
	) => {
		const { nodes, edges, history, historyIndex } = get();
		const nodesToSave = stateOverride?.nodes ?? nodes;
		const edgesToSave = stateOverride?.edges ?? edges;
		const stateToPush = {
			nodes: nodesToSave,
			edges: edgesToSave,
			timestamp: Date.now(),
			actionName: actionName || 'unknown',
		};
		const lastHistoryState = history[historyIndex];

		if (
			!lastHistoryState ||
			JSON.stringify({ nodes: stateToPush.nodes, edges: stateToPush.edges }) !==
				JSON.stringify({
					nodes: lastHistoryState.nodes,
					edges: lastHistoryState.edges,
				})
		) {
			const newHistory = [...history.slice(0, historyIndex + 1), stateToPush];
			set({
				history: newHistory,
				historyIndex: newHistory.length - 1,
				canUndo: newHistory.length > 1,
				canRedo: false,
			});
		}
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
	 * Undo the last state change, restoring nodes/edges and optionally syncing with DB.
	 */
	handleUndo: async () => {
		const { history, historyIndex, setNodes, setEdges } = get();

		if (historyIndex > 0) {
			const prevState = history[historyIndex - 1];
			setNodes(prevState.nodes);
			setEdges(prevState.edges);
			set({
				historyIndex: historyIndex - 1,
				canUndo: historyIndex - 1 > 0,
				canRedo: true,
			});
			// Optionally: sync with DB here if needed
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
	 * Redo the next state change, restoring nodes/edges and optionally syncing with DB.
	 */
	handleRedo: async () => {
		const { history, historyIndex, setNodes, setEdges } = get();

		if (historyIndex < history.length - 1) {
			const nextState = history[historyIndex + 1];
			setNodes(nextState.nodes);
			setEdges(nextState.edges);
			set({
				historyIndex: historyIndex + 1,
				canUndo: true,
				canRedo: historyIndex + 1 < history.length - 1,
			});
			// Optionally: sync with DB here if needed
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
				await loadHistoryFromDB(mapId);
			} else {
				toast.error('Failed to create checkpoint');
			}
		} catch (e) {
			console.error('Failed to create snapshot:', e);
			toast.error('Failed to create checkpoint');
		}
	},

	/**
	 * Revert to a specific history state by index.
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
		} = get();
		if (isReverting || index < 0 || index >= history.length) return;
		if (index === historyIndex) return;
		set({ isReverting: true });
		const targetState = history[index];
		const meta: any = historyMeta?.[index];
		try {
			if (targetState.nodes?.length && targetState.edges?.length) {
				setNodes(targetState.nodes);
				setEdges(targetState.edges);
			} else if (mapId && meta?.type === 'snapshot' && meta?.id) {
				const res = await fetch(`/api/history/${mapId}/revert`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ snapshotId: meta.id }),
				});
				if (res.ok) {
					const data = await res.json();
					setNodes(data.nodes);
					setEdges(data.edges);
					const updated = [...history];
					updated[index] = {
						...targetState,
						nodes: data.nodes,
						edges: data.edges,
					} as any;
					set({ history: updated });
					toast.success('Reverted to snapshot');
				}
			} else if (mapId && meta?.type === 'event' && meta?.id) {
				const res = await fetch(`/api/history/${mapId}/revert`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ eventId: meta.id }),
				});
				if (res.ok) {
					const data = await res.json();
					setNodes(data.nodes);
					setEdges(data.edges);
					const updated = [...history];
					updated[index] = {
						...targetState,
						nodes: data.nodes,
						edges: data.edges,
					} as any;
					set({ history: updated });
					toast.success('Reverted to event');
				} else {
					toast.error('Failed to revert to event');
				}
			} else {
				setNodes(targetState.nodes || []);
				setEdges(targetState.edges || []);
				toast.success('Reverted');
			}
		} finally {
			set({
				historyIndex: index,
				isReverting: false,
				canUndo: index > 0,
				canRedo: index < history.length - 1,
			});
		}
	},
});
