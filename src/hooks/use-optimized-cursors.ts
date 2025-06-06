'use client';

import { getUserCursorColor } from '@/components/collaboration/user-cursor';
import useAppStore from '@/contexts/mind-map/mind-map-store';
import { BroadcastManager } from '@/lib/collaboration/broadcast-manager';
import {
	Bounds,
	CursorSpatialIndex,
	SpatialItem,
} from '@/lib/collaboration/spatial-index';
import { CollaborationUser } from '@/types/sharing-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface CursorData {
	userId: string;
	user: CollaborationUser;
	position: { x: number; y: number };
	color: string;
	lastUpdate: number;
	isActive: boolean;
	velocity?: { x: number; y: number };
}

interface UseOptimizedCursorsOptions {
	viewportRef: React.RefObject<HTMLElement>;
	enabled?: boolean;
	maxCursors?: number;
	updateInterval?: number;
	spatialIndexBounds?: Bounds;
	hideInactiveAfterMs?: number;
	smoothing?: boolean;
	enablePrediction?: boolean;
}

interface UseOptimizedCursorsReturn {
	visibleCursors: CursorData[];
	totalCursors: number;
	updateCursor: (userId: string, position: { x: number; y: number }) => void;
	removeCursor: (userId: string) => void;
	isOptimized: boolean;
	stats: {
		renderCount: number;
		updateCount: number;
		spatialIndexStats: any;
	};
}

export function useOptimizedCursors(
	mapId: string,
	userId: string,
	options: UseOptimizedCursorsOptions
): UseOptimizedCursorsReturn {
	const {
		viewportRef,
		enabled = true,
		maxCursors = 50,
		updateInterval = 16, // ~60fps
		spatialIndexBounds = { x: 0, y: 0, width: 10000, height: 10000 },
		hideInactiveAfterMs = 5000,
		smoothing = true,
		enablePrediction = false,
	} = options;

	const { activeUsers } = useAppStore();

	// State
	const [visibleCursors, setVisibleCursors] = useState<CursorData[]>([]);
	const [renderCount, setRenderCount] = useState(0);
	const [updateCount, setUpdateCount] = useState(0);

	// Refs
	const spatialIndexRef = useRef<CursorSpatialIndex<CursorData>>(null);
	const broadcastManagerRef = useRef<BroadcastManager>(null);
	const updateQueueRef = useRef<Map<string, { x: number; y: number }>>(
		new Map()
	);
	const inactivityTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
	const animationFrameRef = useRef<number>(null);
	const lastUpdateRef = useRef<number>(0);
	const viewportBoundsRef = useRef<Bounds>({ x: 0, y: 0, width: 0, height: 0 });

	// Initialize spatial index
	useEffect(() => {
		if (!enabled) return;

		spatialIndexRef.current = new CursorSpatialIndex<CursorData>(
			spatialIndexBounds,
			{
				maxItemsPerNode: 8,
				maxDepth: 6,
				viewportBuffer: 200,
			}
		);

		return () => {
			spatialIndexRef.current?.clear();
		};
	}, [enabled, spatialIndexBounds]);

	// Initialize broadcast manager
	useEffect(() => {
		if (!enabled || !mapId || !userId) return;

		const broadcastManager = new BroadcastManager({
			mapId,
			userId,
			throttleMs: 50,
			enableLogging: false,
		});

		broadcastManagerRef.current = broadcastManager;

		broadcastManager.connect().then(() => {
			const unsubscribe = broadcastManager.subscribe('cursor_move', (event) => {
				if (event.userId !== userId) {
					const user = activeUsers.find((u) => u.id === event.userId);

					if (user) {
						queueCursorUpdate(event.userId, event.data.position);
					}
				}
			});

			return () => {
				unsubscribe();
			};
		});

		return () => {
			broadcastManager.disconnect();
			broadcastManagerRef.current = null;
		};
	}, [enabled, mapId, userId, activeUsers]);

	// Queue cursor update for batching
	const queueCursorUpdate = useCallback(
		(userId: string, position: { x: number; y: number }) => {
			updateQueueRef.current.set(userId, position);
			setUpdateCount((prev) => prev + 1);
		},
		[]
	);

	// Update cursor in spatial index
	const updateCursorInIndex = useCallback(
		(userId: string, position: { x: number; y: number }) => {
			if (!spatialIndexRef.current) return;

			const user = activeUsers.find((u) => u.id === userId);
			if (!user) return;

			const existingItem = spatialIndexRef.current.get(userId);
			const now = Date.now();

			if (existingItem) {
				// Update existing cursor with velocity tracking
				if (enablePrediction) {
					spatialIndexRef.current.updateWithVelocity(userId, position);
				} else {
					spatialIndexRef.current.update(userId, position);
				}

				existingItem.data.position = position;
				existingItem.data.lastUpdate = now;
				existingItem.data.isActive = true;
			} else {
				// Create new cursor
				const cursorData: CursorData = {
					userId,
					// @ts-expect-error todo: implement user cursor
					user,
					position,
					color: getUserCursorColor(userId),
					lastUpdate: now,
					isActive: true,
				};

				const spatialItem: SpatialItem<CursorData> = {
					id: userId,
					position,
					data: cursorData,
				};

				spatialIndexRef.current.insert(spatialItem);
			}

			// Reset inactivity timer
			resetInactivityTimer(userId);
		},
		[activeUsers, enablePrediction, hideInactiveAfterMs]
	);

	// Reset inactivity timer
	const resetInactivityTimer = useCallback(
		(userId: string) => {
			// Clear existing timer
			const existingTimer = inactivityTimersRef.current.get(userId);

			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			// Set new timer
			if (hideInactiveAfterMs > 0) {
				const timer = setTimeout(() => {
					if (spatialIndexRef.current) {
						const item = spatialIndexRef.current.get(userId);

						if (item) {
							item.data.isActive = false;
						}
					}

					inactivityTimersRef.current.delete(userId);
				}, hideInactiveAfterMs);

				inactivityTimersRef.current.set(userId, timer);
			}
		},
		[hideInactiveAfterMs]
	);

	// Process update queue
	const processUpdateQueue = useCallback(() => {
		if (updateQueueRef.current.size === 0) return;

		const updates = Array.from(updateQueueRef.current.entries());
		updateQueueRef.current.clear();

		// Batch update cursors
		updates.forEach(([userId, position]) => {
			updateCursorInIndex(userId, position);
		});
	}, [updateCursorInIndex]);

	// Update visible cursors based on viewport
	const updateVisibleCursors = useCallback(() => {
		if (!spatialIndexRef.current || !viewportRef.current) return;

		const viewport = viewportRef.current;
		const bounds: Bounds = {
			x: viewport.scrollLeft,
			y: viewport.scrollTop,
			width: viewport.clientWidth,
			height: viewport.clientHeight,
		};

		// Only update if viewport has changed significantly
		const boundsChanged =
			Math.abs(bounds.x - viewportBoundsRef.current.x) > 10 ||
			Math.abs(bounds.y - viewportBoundsRef.current.y) > 10 ||
			Math.abs(bounds.width - viewportBoundsRef.current.width) > 10 ||
			Math.abs(bounds.height - viewportBoundsRef.current.height) > 10;

		if (!boundsChanged && updateQueueRef.current.size === 0) {
			return;
		}

		viewportBoundsRef.current = bounds;

		// Query spatial index for visible cursors
		const visibleItems = enablePrediction
			? spatialIndexRef.current.queryWithPrediction(bounds, 100)
			: spatialIndexRef.current.query(bounds);

		// Filter and sort cursors
		const cursors = visibleItems
			.map((item) => item.data)
			.filter((cursor) => cursor.isActive && cursor.userId !== userId)
			.sort((a, b) => b.lastUpdate - a.lastUpdate)
			.slice(0, maxCursors);

		setVisibleCursors(cursors);
		setRenderCount((prev) => prev + 1);
	}, [viewportRef, userId, maxCursors, enablePrediction]);

	// Animation loop
	const animate = useCallback(() => {
		const now = Date.now();
		const deltaTime = now - lastUpdateRef.current;

		if (deltaTime >= updateInterval) {
			// Process queued updates
			processUpdateQueue();

			// Update visible cursors
			updateVisibleCursors();

			lastUpdateRef.current = now;
		}

		animationFrameRef.current = requestAnimationFrame(animate);
	}, [updateInterval, processUpdateQueue, updateVisibleCursors]);

	// Start animation loop
	useEffect(() => {
		if (!enabled) return;

		animate();

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [enabled, animate]);

	// Handle viewport scroll
	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport || !enabled) return;

		const handleScroll = () => {
			// Mark viewport as dirty to trigger update
			updateVisibleCursors();
		};

		viewport.addEventListener('scroll', handleScroll, { passive: true });

		// Also handle resize
		const resizeObserver = new ResizeObserver(() => {
			updateVisibleCursors();
		});

		resizeObserver.observe(viewport);

		return () => {
			viewport.removeEventListener('scroll', handleScroll);
			resizeObserver.disconnect();
		};
	}, [viewportRef, enabled, updateVisibleCursors]);

	// Public methods
	const updateCursor = useCallback(
		(userId: string, position: { x: number; y: number }) => {
			queueCursorUpdate(userId, position);
		},
		[queueCursorUpdate]
	);

	const removeCursor = useCallback(
		(userId: string) => {
			if (spatialIndexRef.current) {
				spatialIndexRef.current.remove(userId);
			}

			// Clear inactivity timer
			const timer = inactivityTimersRef.current.get(userId);

			if (timer) {
				clearTimeout(timer);
				inactivityTimersRef.current.delete(userId);
			}

			// Trigger update
			updateVisibleCursors();
		},
		[updateVisibleCursors]
	);

	// Get stats
	const stats = useMemo(
		() => ({
			renderCount,
			updateCount,
			spatialIndexStats: spatialIndexRef.current?.getStats() || null,
		}),
		[renderCount, updateCount]
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// Clear all timers
			inactivityTimersRef.current.forEach((timer) => clearTimeout(timer));
			inactivityTimersRef.current.clear();

			// Clear spatial index
			spatialIndexRef.current?.clear();

			// Cancel animation frame
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	return {
		visibleCursors,
		totalCursors: spatialIndexRef.current?.size() || 0,
		updateCursor,
		removeCursor,
		isOptimized: true,
		stats,
	};
}

// Helper hook for debugging cursor performance
export function useCursorPerformanceMonitor(stats: any) {
	useEffect(() => {
		if (process.env.NODE_ENV !== 'development') return;

		const logPerformance = () => {
			console.log('Cursor Performance:', {
				renderCount: stats.renderCount,
				updateCount: stats.updateCount,
				fps:
					stats.renderCount > 0
						? Math.round(1000 / (16 * stats.renderCount))
						: 0,
				...stats.spatialIndexStats,
			});
		};

		const interval = setInterval(logPerformance, 5000);
		return () => clearInterval(interval);
	}, [stats]);
}
