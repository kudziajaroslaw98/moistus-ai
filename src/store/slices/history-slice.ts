import { calculateDelta } from '@/helpers/history/delta-calculator';
import {
	transformSupabaseData,
	type SupabaseMapData,
} from '@/helpers/transform-supabase-data';
import {
	broadcast,
	BROADCAST_EVENTS,
	subscribeToSyncEvents,
	type HistoryRevertPayload,
} from '@/lib/realtime/broadcast-channel';
import { AppEdge } from '@/types/app-edge';
import { AppNode } from '@/types/app-node';
import { AttributedHistoryDelta, HistoryItem } from '@/types/history-state';
import { toast } from 'sonner';
import { StateCreator } from 'zustand';
import { AppState, HistorySlice } from '../app-state';

export const createHistorySlice: StateCreator<
	AppState,
	[],
	[],
	HistorySlice
> = (set, get) => ({
	// state - DB-only history (no in-memory snapshots)
	historyMeta: [],
	historyIndex: -1, // Index into historyMeta for current position
	isReverting: false,
	revertingIndex: null, // Which history item is currently reverting
	_historyCurrentSubscription: null,
	_historySubscriptionPending: false, // Guard against concurrent subscription attempts

	// pagination
	historyPageOffset: 0,
	historyPageLimit: 50,
	historyHasMore: false,

	/**
	 * Load recent history metadata from the API.
	 * Only stores metadata (no full node/edge snapshots in memory).
	 */
	loadHistoryFromDB: async () => {
		const { setLoadingStates, mapId } = get();
		try {
			if (!mapId) return;
			setLoadingStates?.({ isHistoryLoading: true });
			const limit = get().historyPageLimit || 50;

			// Capture previous selection before fetching so we can retain it
			const prevMeta = get().historyMeta;
			const prevIndex = get().historyIndex;
			const prevSelectedId = prevMeta?.[prevIndex]?.id;
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_APP_LOCAL_HREF}/api/history/${mapId}/list`
			);
			if (!res.ok) return;
			const data = await res.json();
			const itemsDesc = (data.items || []) as any[];
			const itemsAsc = [...itemsDesc].reverse();

			// Compute desired selection from DB pointer first, fallback to previous selection, else newest
			const desiredIdFromDB: string | undefined =
				data.currentEventId || data.currentSnapshotId || undefined;
			const desiredId: string | undefined = desiredIdFromDB || prevSelectedId;
			const retainedIndex = desiredId
				? itemsAsc.findIndex((i: any) => i.id === desiredId)
				: -1;
			const nextIndex =
				retainedIndex >= 0 ? retainedIndex : Math.max(0, itemsAsc.length - 1);

			set({
				historyMeta: itemsAsc,
				historyIndex: nextIndex,
				historyPageOffset: itemsAsc.length,
				historyHasMore: !!data.hasMore,
			});
		} catch (e) {
			console.error('Failed to load history from DB:', e);
		} finally {
			setLoadingStates?.({ isHistoryLoading: false });
		}
	},

	// Real-time subscription to history revert events via broadcast
	subscribeToHistoryCurrent: async (mapId: string) => {
		// Guard against concurrent subscription attempts (prevents infinite loop)
		if (get()._historySubscriptionPending) {
			return;
		}
		set({ _historySubscriptionPending: true });

		try {
			// Clean up any existing subscription before creating a new one
			const existingSub = get()._historyCurrentSubscription;
			if (existingSub && typeof (existingSub as any).unsubscribe === 'function') {
				try {
					await (existingSub as any).unsubscribe();
				} catch (e) {
					console.warn('[broadcast] Failed to unsubscribe previous history subscription:', e);
				}
				set({ _historyCurrentSubscription: null });
			}

			// Use secure broadcast channel instead of postgres_changes
			// This provides RLS-protected real-time sync via private channels
			const handleHistoryRevert = async (payload: HistoryRevertPayload) => {
				const {
					currentUser,
					popoverOpen,
					loadHistoryFromDB,
					mapId,
					supabase,
					setNodes,
					setEdges,
					markNodeAsSystemUpdate,
					markEdgeAsSystemUpdate,
				} = get();

				// Ignore our own broadcasts
				if (payload.userId === currentUser?.id) return;

				// Fetch current map state via aggregated view and apply it
				// This ensures the canvas reflects the new state after another user reverts
				if (mapId) {
					try {
						const { data, error } = await supabase
							.from('map_graph_aggregated_view')
							.select('*')
							.eq('map_id', mapId)
							.single();

						if (!error && data) {
							const transformed = transformSupabaseData(data as SupabaseMapData);

							// Mark all nodes/edges as system updates to prevent broadcast loops
							// (we're receiving state, not initiating changes)
							transformed.reactFlowNodes.forEach((n) => markNodeAsSystemUpdate(n.id));
							transformed.reactFlowEdges.forEach((e) => markEdgeAsSystemUpdate(e.id));

							setNodes(transformed.reactFlowNodes);
							setEdges(transformed.reactFlowEdges);
						}
					} catch (e) {
						console.error('[broadcast] Failed to sync after history revert:', e);
					}
				}

				// Reload history metadata if panel is open
				if (popoverOpen?.history) {
					loadHistoryFromDB();
				}
			};

			const cleanup = await subscribeToSyncEvents(mapId, {
				onHistoryRevert: handleHistoryRevert,
			});

			// Store cleanup function for later unsubscription
			set({
				_historyCurrentSubscription: {
					unsubscribe: cleanup,
				},
			});

		} catch (e) {
			console.error('[broadcast] Failed to subscribe to history events:', e);
		} finally {
			set({ _historySubscriptionPending: false });
		}
	},

	unsubscribeFromHistoryCurrent: async () => {
		const { _historyCurrentSubscription } = get();
		if (_historyCurrentSubscription) {
			try {
				// Call cleanup function (decrements ref count, unsubscribes when count reaches 0)
				if (typeof (_historyCurrentSubscription as any).unsubscribe === 'function') {
					await (_historyCurrentSubscription as any).unsubscribe();
				}
				set({ _historyCurrentSubscription: null });
			} catch (e) {
				console.error('[broadcast] Failed to unsubscribe from history events:', e);
			}
		}
	},

	// Load older pages (prepend older items)
	loadMoreHistory: async (mapId: string) => {
		const { setLoadingStates } = get();
		try {
			if (!mapId) return;
			setLoadingStates?.({ isHistoryLoading: true });
			const { historyPageOffset, historyPageLimit, historyMeta } = get();
			const res = await fetch(
				`/api/history/${mapId}/list?limit=${historyPageLimit}&offset=${historyPageOffset}`,
				{ cache: 'no-store' }
			);
			if (!res.ok) return;
			const data = await res.json();
			const itemsDesc = (data.items || []) as any[];
			const itemsAsc = [...itemsDesc].reverse();
			const newMeta = [...itemsAsc, ...historyMeta];
			set({
				historyMeta: newMeta,
				historyPageOffset: historyPageOffset + itemsAsc.length,
				historyHasMore: !!data.hasMore,
				historyIndex:
					(get().historyIndex ?? newMeta.length - 1) + itemsAsc.length,
			});
		} catch (e) {
			console.error('Failed to load more history:', e);
		} finally {
			setLoadingStates?.({ isHistoryLoading: false });
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
	 * Compute and persist a delta event without mutating in-memory history.
	 * This is the primary way to record history changes to the database.
	 */
	persistDeltaEvent: async (
		actionName: string,
		prev: { nodes: AppNode[]; edges: AppEdge[] },
		next: { nodes: AppNode[]; edges: AppEdge[] }
	) => {
		try {
			const { supabase, mapId, currentUser, isReverting } = get();
			// Suppress DB history recording during revert
			if (isReverting) return;
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

			// Insert event and retrieve its id to move the current pointer
			const { data: insertedEv } = await supabase
				.from('map_history_events')
				.insert({
					map_id: mapId,
					user_id: userId,
					snapshot_id: snapshotId,
					event_index: nextEventIndex,
					action_name: actionName,
					operation_type: delta.operation,
					entity_type: delta.entityType,
					changes: delta,
				})
				.select('id, snapshot_id')
				.single();

			if (insertedEv) {
				try {
					await supabase.from('map_history_current').upsert(
						{
							map_id: mapId,
							snapshot_id: insertedEv.snapshot_id,
							event_id: insertedEv.id,
							updated_by: userId,
							updated_at: new Date().toISOString(),
						},
						{ onConflict: 'map_id' }
					);

					// If history panel is open, refresh to reflect new current pointer
					const { popoverOpen, loadHistoryFromDB, mapId: currentMapId } = get();
					if (popoverOpen?.history && currentMapId) {
						await loadHistoryFromDB();
					}
				} catch (pointerErr) {
					console.error(
						'Failed to update current history pointer:',
						pointerErr
					);
				}
			}
		} catch (e) {
			console.error('persistDeltaEvent failed:', e);
		}
	},

	/**
	 * Revert to a specific history state by index.
	 * Fetches full state from DB API and applies it.
	 * @param index The history index to revert to
	 */
	revertToHistoryState: async (index: number) => {
		const {
			historyMeta,
			historyIndex,
			setNodes,
			setEdges,
			isReverting,
			mapId,
			canRevertChange,
			markNodeAsSystemUpdate,
			markEdgeAsSystemUpdate,
		} = get();
		if (isReverting || index < 0 || index >= historyMeta.length) return;
		if (index === historyIndex) return;

		const meta: HistoryItem | undefined = historyMeta?.[index];
		if (!meta || !mapId) return;

		// Permission check: client-side permission is handled in history-item.tsx
		// (canRevertChange), server-side permission is enforced by the API

		set({ isReverting: true, revertingIndex: index });

		try {
			// NOTE: No need to unsubscribe from real-time anymore.
			// All broadcast handlers filter self-events via userId check.

			// Step 2: Revert via API (snapshot or event)
			const { currentUser } = get();

			if (meta.type === 'snapshot' && meta.id) {
				// Revert to database snapshot
				const res = await fetch(`/api/history/${mapId}/revert`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ snapshotId: meta.id }),
				});

				if (res.ok) {
					const data = await res.json();

					// Mark all nodes and edges as system-updated
					data.nodes.forEach((n: AppNode) => markNodeAsSystemUpdate(n.id));
					data.edges.forEach((e: AppEdge) => markEdgeAsSystemUpdate(e.id));

					setNodes(data.nodes);
					setEdges(data.edges);

					// Broadcast history revert to other clients
					await broadcast(mapId, BROADCAST_EVENTS.HISTORY_REVERT, {
						historyEntryId: meta.id,
						userId: currentUser?.id || 'unknown',
						timestamp: Date.now(),
					});

					// Update historyIndex and clear reverting state immediately
					// Canvas already shows reverted state, so buttons should re-enable now
					set({ historyIndex: index, isReverting: false, revertingIndex: null });
					toast.success('Reverted to snapshot');
				} else {
					const error = await res.json().catch(() => ({}));
					toast.error(error.error || 'Failed to revert to snapshot');
				}
			} else if (meta.type === 'event' && meta.id) {
				// Revert to database event
				const res = await fetch(`/api/history/${mapId}/revert`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ eventId: meta.id }),
				});

				if (res.ok) {
					const data = await res.json();

					// Mark all nodes and edges as system-updated
					data.nodes.forEach((n: AppNode) => markNodeAsSystemUpdate(n.id));
					data.edges.forEach((e: AppEdge) => markEdgeAsSystemUpdate(e.id));

					setNodes(data.nodes);
					setEdges(data.edges);

					// Broadcast history revert to other clients
					await broadcast(mapId, BROADCAST_EVENTS.HISTORY_REVERT, {
						historyEntryId: meta.id,
						userId: currentUser?.id || 'unknown',
						timestamp: Date.now(),
					});

					// Update historyIndex and clear reverting state immediately
					// Canvas already shows reverted state, so buttons should re-enable now
					set({ historyIndex: index, isReverting: false, revertingIndex: null });
					toast.success('Reverted to event');
				} else {
					const error = await res.json().catch(() => ({}));
					toast.error(error.error || 'Failed to revert to event');
				}
			} else {
				toast.error('Invalid history entry - cannot revert');
			}
		} catch (error) {
			console.error('Revert failed:', error);
			toast.error('Failed to revert state');
		} finally {
			// Only clear if still reverting (error case cleanup)
			// Success paths already cleared isReverting immediately after canvas update
			if (get().isReverting) {
				set({ isReverting: false, revertingIndex: null });
			}
		}
	},
});
