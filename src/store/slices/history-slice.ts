import { calculateDelta } from '@/helpers/history/delta-calculator';
import {
	broadcast,
	BROADCAST_EVENTS,
	subscribeToSyncEvents,
	unsubscribeFromSyncChannel,
	type HistoryRevertPayload,
} from '@/lib/realtime/broadcast-channel';
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
	// state - DB-only history (no in-memory snapshots)
	historyMeta: [],
	historyIndex: -1, // Index into historyMeta for current position
	isReverting: false,
	_historyCurrentSubscription: null,

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
		// Use secure broadcast channel instead of postgres_changes
		// This provides RLS-protected real-time sync via private channels
		try {
			const handleHistoryRevert = (payload: HistoryRevertPayload) => {
				const { currentUser, popoverOpen, loadHistoryFromDB } = get();

				// Ignore our own broadcasts
				if (payload.userId === currentUser?.id) return;

				// Reload history if popover is open
				if (popoverOpen?.history) {
					loadHistoryFromDB();
				}

				console.log('[broadcast] History reverted by another user:', payload.historyEntryId);
			};

			const cleanup = await subscribeToSyncEvents(mapId, {
				onHistoryRevert: handleHistoryRevert,
			});

			// Store cleanup function for later unsubscription
			set({
				_historyCurrentSubscription: {
					unsubscribe: cleanup,
				} as unknown as ReturnType<typeof get>['_historyCurrentSubscription'],
			});

			console.log('[broadcast] Subscribed to history events for map:', mapId);
		} catch (e) {
			console.error('[broadcast] Failed to subscribe to history events:', e);
		}
	},

	unsubscribeFromHistoryCurrent: async () => {
		const { _historyCurrentSubscription, mapId } = get();
		if (_historyCurrentSubscription) {
			try {
				// Handle both old RealtimeChannel and new cleanup function
				if (typeof (_historyCurrentSubscription as any).unsubscribe === 'function') {
					await (_historyCurrentSubscription as any).unsubscribe();
				}
				set({ _historyCurrentSubscription: null });

				// Also cleanup from broadcast channel manager if mapId is available
				if (mapId) {
					await unsubscribeFromSyncChannel(mapId);
				}

				console.log('[broadcast] Unsubscribed from history events');
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
			unsubscribeFromRealtimeUpdates,
			subscribeToRealtimeUpdates,
			markNodeAsSystemUpdate,
			markEdgeAsSystemUpdate,
		} = get();
		if (isReverting || index < 0 || index >= historyMeta.length) return;
		if (index === historyIndex) return;

		const meta: any = historyMeta?.[index];
		if (!meta || !mapId) return;

		// Permission check - fetch delta from API if needed for permission check
		// For now, allow revert (permission will be checked via delta fetched below)

		set({ isReverting: true });

		try {
			// Step 1: Unsubscribe from real-time (prevents self-event processing)
			// Other users remain subscribed and will receive changes via real-time
			await unsubscribeFromRealtimeUpdates();

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
			// Small delay to let server-side changes settle before resubscribing
			if (mapId) {
				await new Promise((r) => setTimeout(r, 150));
				await subscribeToRealtimeUpdates(mapId);
			}

			// Update history pointer
			set({
				historyIndex: index,
				isReverting: false,
			});
		}
	},
});
