'use client';

import useAppStore from '@/contexts/mind-map/mind-map-store';
import {
	BroadcastManager,
	CursorMoveData,
} from '@/lib/collaboration/broadcast-manager';
import { CollaborationUser } from '@/types/sharing-types';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CursorPosition {
	x: number;
	y: number;
	timestamp: number;
}

interface UserCursor {
	userId: string;
	position: CursorPosition;
	user: CollaborationUser;
	lastUpdate: number;
}

interface UseCursorTrackingOptions {
	enabled?: boolean;
	throttleMs?: number;
	smoothing?: boolean;
	hideAfterMs?: number;
	containerRef?: React.RefObject<HTMLElement>;
}

interface UseCursorTrackingReturn {
	cursors: UserCursor[];
	localCursor: CursorPosition | null;
	isTracking: boolean;
	startTracking: () => void;
	stopTracking: () => void;
	updateLocalCursor: (x: number, y: number) => void;
}

export function useCursorTracking(
	mapId: string,
	userId: string,
	options: UseCursorTrackingOptions = {}
): UseCursorTrackingReturn {
	const {
		enabled = true,
		throttleMs = 50,
		smoothing = true,
		hideAfterMs = 5000,
		containerRef,
	} = options;

	const { activeUsers } = useAppStore();

	const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
	const [localCursor, setLocalCursor] = useState<CursorPosition | null>(null);
	const [isTracking, setIsTracking] = useState(false);

	const broadcastManagerRef = useRef<BroadcastManager | null>(null);
	const lastBroadcastRef = useRef<number>(0);
	const hideTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
	const animationFrameRef = useRef<number | null>(null);
	const smoothingPositionsRef = useRef<
		Map<string, { current: CursorPosition; target: CursorPosition }>
	>(new Map());

	// Initialize broadcast manager
	useEffect(() => {
		if (!enabled || !mapId || !userId) return;

		const broadcastManager = new BroadcastManager({
			mapId,
			userId,
			throttleMs,
			enableLogging: false,
		});

		broadcastManagerRef.current = broadcastManager;

		// Connect and subscribe to cursor events
		broadcastManager.connect().then(() => {
			const unsubscribe = broadcastManager.subscribe('cursor_move', (event) => {
				if (event.userId !== userId) {
					handleRemoteCursorUpdate(event.userId, event.data as CursorMoveData);
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
	}, [enabled, mapId, userId, throttleMs]);

	// Handle remote cursor updates
	const handleRemoteCursorUpdate = useCallback(
		(remoteUserId: string, data: CursorMoveData) => {
			const user = activeUsers.find((u) => u.id === remoteUserId);
			if (!user) return;

			const position: CursorPosition = {
				x: data.position.x,
				y: data.position.y,
				timestamp: Date.now(),
			};

			// Update cursor position
			setCursors((prev) => {
				const newCursors = new Map(prev);
				const existingCursor = newCursors.get(remoteUserId);

				if (smoothing) {
					// Update smoothing positions
					const smoothingPos = smoothingPositionsRef.current.get(
						remoteUserId
					) || {
						current: position,
						target: position,
					};

					smoothingPos.target = position;

					if (!existingCursor) {
						smoothingPos.current = position;
					}

					smoothingPositionsRef.current.set(remoteUserId, smoothingPos);
				}

				newCursors.set(remoteUserId, {
					userId: remoteUserId,
					position:
						smoothing && existingCursor ? existingCursor.position : position,
					// @ts-expect-error todo: implement user cursor
					user,
					lastUpdate: Date.now(),
				});

				return newCursors;
			});

			// Reset hide timer
			resetHideTimer(remoteUserId);
		},
		[activeUsers, smoothing, hideAfterMs]
	);

	// Reset hide timer for a user
	const resetHideTimer = useCallback(
		(remoteUserId: string) => {
			// Clear existing timer
			const existingTimer = hideTimersRef.current.get(remoteUserId);

			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			// Set new timer
			if (hideAfterMs > 0) {
				const timer = setTimeout(() => {
					setCursors((prev) => {
						const newCursors = new Map(prev);
						newCursors.delete(remoteUserId);
						return newCursors;
					});

					smoothingPositionsRef.current.delete(remoteUserId);
					hideTimersRef.current.delete(remoteUserId);
				}, hideAfterMs);

				hideTimersRef.current.set(remoteUserId, timer);
			}
		},
		[hideAfterMs]
	);

	// Smoothing animation loop
	useEffect(() => {
		if (!smoothing || cursors.size === 0) return;

		const animate = () => {
			let hasUpdates = false;

			setCursors((prev) => {
				const newCursors = new Map(prev);

				smoothingPositionsRef.current.forEach((smoothingPos, userId) => {
					const cursor = newCursors.get(userId);
					if (!cursor) return;

					const dx = smoothingPos.target.x - smoothingPos.current.x;
					const dy = smoothingPos.target.y - smoothingPos.current.y;
					const distance = Math.sqrt(dx * dx + dy * dy);

					if (distance > 0.5) {
						hasUpdates = true;

						// Smooth interpolation
						const speed = 0.15; // Adjust for smoother/faster movement
						smoothingPos.current.x += dx * speed;
						smoothingPos.current.y += dy * speed;

						newCursors.set(userId, {
							...cursor,
							position: {
								x: smoothingPos.current.x,
								y: smoothingPos.current.y,
								timestamp: Date.now(),
							},
						});
					}
				});

				return newCursors;
			});

			if (hasUpdates) {
				animationFrameRef.current = requestAnimationFrame(animate);
			} else {
				animationFrameRef.current = null;
			}
		};

		animate();

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [smoothing, cursors.size]);

	// Track local cursor movement
	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isTracking || !broadcastManagerRef.current) return;

			const now = Date.now();
			let x = event.clientX;
			let y = event.clientY;

			// Convert to container-relative coordinates if containerRef is provided
			if (containerRef?.current) {
				const rect = containerRef.current.getBoundingClientRect();
				x = event.clientX - rect.left;
				y = event.clientY - rect.top;
			}

			const position: CursorPosition = { x, y, timestamp: now };
			setLocalCursor(position);

			// Throttle broadcasts
			if (now - lastBroadcastRef.current >= throttleMs) {
				lastBroadcastRef.current = now;

				broadcastManagerRef.current.broadcastCursorMove({
					position: { x, y },
					viewport: containerRef?.current
						? {
								x: containerRef.current.scrollLeft,
								y: containerRef.current.scrollTop,
								zoom: 1, // You can pass actual zoom level if available
							}
						: undefined,
				});
			}
		},
		[isTracking, throttleMs, containerRef]
	);

	// Start tracking
	const startTracking = useCallback(() => {
		if (!enabled) return;

		setIsTracking(true);

		const target = containerRef?.current || document;
		target.addEventListener('mousemove', handleMouseMove as any);

		// Also track when mouse leaves the viewport
		const handleMouseLeave = () => {
			setLocalCursor(null);
		};

		target.addEventListener('mouseleave', handleMouseLeave as any);

		return () => {
			target.removeEventListener('mousemove', handleMouseMove as any);
			target.removeEventListener('mouseleave', handleMouseLeave as any);
		};
	}, [enabled, handleMouseMove, containerRef]);

	// Stop tracking
	const stopTracking = useCallback(() => {
		setIsTracking(false);
		setLocalCursor(null);

		const target = containerRef?.current || document;
		target.removeEventListener('mousemove', handleMouseMove as any);
	}, [handleMouseMove, containerRef]);

	// Update local cursor manually
	const updateLocalCursor = useCallback((x: number, y: number) => {
		if (!broadcastManagerRef.current) return;

		const position: CursorPosition = { x, y, timestamp: Date.now() };
		setLocalCursor(position);

		broadcastManagerRef.current.broadcastCursorMove({
			position: { x, y },
		});
	}, []);

	// Auto-start tracking when enabled
	useEffect(() => {
		if (enabled && !isTracking) {
			const cleanup = startTracking();
			return cleanup;
		} else if (!enabled && isTracking) {
			stopTracking();
		}
	}, [enabled, isTracking, startTracking, stopTracking]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// Clear all hide timers
			hideTimersRef.current.forEach((timer) => clearTimeout(timer));
			hideTimersRef.current.clear();

			// Clear animation frame
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}

			// Clear smoothing positions
			smoothingPositionsRef.current.clear();
		};
	}, []);

	// Convert cursors map to array
	const cursorsArray = Array.from(cursors.values());

	return {
		cursors: cursorsArray,
		localCursor,
		isTracking,
		startTracking,
		stopTracking,
		updateLocalCursor,
	};
}

// Helper hook for viewport-relative cursor tracking
export function useViewportCursorTracking(
	mapId: string,
	userId: string,
	viewportRef: React.RefObject<HTMLElement>,
	options?: Omit<UseCursorTrackingOptions, 'containerRef'>
) {
	return useCursorTracking(mapId, userId, {
		...options,
		containerRef: viewportRef,
	});
}

// Helper hook for getting cursor color
export function useCursorColor(userId: string): string {
	const colors = [
		'#f87171', // red-400
		'#fb923c', // orange-400
		'#fbbf24', // amber-400
		'#34d399', // emerald-400
		'#60a5fa', // blue-400
		'#818cf8', // indigo-400
		'#a78bfa', // violet-400
		'#f472b6', // pink-400
	];

	let hash = 0;

	for (let i = 0; i < userId.length; i++) {
		hash = (hash << 5) - hash + userId.charCodeAt(i);
		hash = hash & hash;
	}

	return colors[Math.abs(hash) % colors.length];
}
