import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { createPrivateChannel } from '@/lib/realtime/broadcast-channel';
import useAppStore from '@/store/mind-map-store';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ReactFlowInstance } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useCurrentUserName } from '../use-current-username';
import { useUserColor } from '../use-user-color';

const supabase = getSharedSupabaseClient();

/**
 * Throttle a callback to a certain delay, It will only call the callback if the delay has passed, with the arguments
 * from the last call
 */
const useThrottleCallback = <Params extends unknown[], Return>(
	callback: (...args: Params) => Return,
	delay: number
) => {
	const lastCall = useRef(0);
	const timeout = useRef<NodeJS.Timeout | null>(null);

	return useCallback(
		(...args: Params) => {
			const now = Date.now();
			const remainingTime = delay - (now - lastCall.current);

			if (remainingTime <= 0) {
				if (timeout.current) {
					clearTimeout(timeout.current);
					timeout.current = null;
				}

				lastCall.current = now;
				callback(...args);
			} else if (!timeout.current) {
				timeout.current = setTimeout(() => {
					lastCall.current = Date.now();
					timeout.current = null;
					callback(...args);
				}, remainingTime);
			}
		},
		[callback, delay]
	);
};

const EVENT_NAME = 'realtime-cursor-move';

type CursorEventPayload = {
	position: {
		x: number;
		y: number;
	};
	user: {
		id: string;
		name: string;
	};
	color: string;
	timestamp: number;
};

export const useRealtimeCursors = ({
	roomName,
	throttleMs,
	reactFlowInstance,
	debug = false,
}: {
	roomName: string;
	throttleMs: number;
	reactFlowInstance?: ReactFlowInstance;
	debug?: boolean;
}) => {
	const username = useCurrentUserName();
	const { currentUser } = useAppStore(
		useShallow((state) => ({ currentUser: state.currentUser }))
	);
	const { hsl: color } = useUserColor(
		currentUser?.id || currentUser?.email || 'anonymous'
	);

	// Use authenticated user ID if available, otherwise generate stable session UUID
	// SECURITY: Uses crypto.randomUUID() instead of Math.random() to prevent collisions
	const userId = useMemo(
		() => currentUser?.id || crypto.randomUUID(),
		[currentUser?.id]
	);
	const [cursors, setCursors] = useState<Record<string, CursorEventPayload>>(
		{}
	);

	const channelRef = useRef<RealtimeChannel | null>(null);

	const callback = useCallback(
		(event: MouseEvent) => {
			const { clientX, clientY } = event;

			// Transform viewport coordinates to pane coordinates if ReactFlow instance is available
			let position = { x: clientX, y: clientY };

			if (reactFlowInstance) {
				try {
					position = reactFlowInstance.screenToFlowPosition({
						x: clientX,
						y: clientY,
					});
				} catch (error) {
					// Fallback to viewport coordinates if transformation fails
					console.warn('Failed to transform cursor coordinates:', error);
					position = { x: clientX, y: clientY };
				}
			}

			const payload: CursorEventPayload = {
				position,
				user: {
					id: userId,
					name: username,
				},
				color: color,
				timestamp: new Date().getTime(),
			};

			// Send cursor position
			if (channelRef.current && payload.user.name && payload.user.id) {
				channelRef.current.send({
					type: 'broadcast',
					event: EVENT_NAME,
					payload: payload,
				});
			}
		},
		[color, userId, username, reactFlowInstance, debug]
	);

	const handleMouseMove = useThrottleCallback(callback, throttleMs);

	useEffect(() => {
		let channel: RealtimeChannel | null = null;
		let isCleanedUp = false;

		// SECURITY: Use private channel with RLS authorization
		// This ensures only users with map access can receive/send cursor updates
		const setupChannel = async () => {
			try {
				channel = await createPrivateChannel(roomName);
				if (isCleanedUp) {
					channel.unsubscribe();
					return;
				}
				channelRef.current = channel;

				channel
					.on(
						'broadcast',
						{ event: EVENT_NAME },
						(data: { payload: CursorEventPayload }) => {
							// Validate received payload
							if (!data?.payload?.user?.id || !data?.payload?.position) {
								console.warn('Invalid cursor payload received:', data);
								return;
							}

							const { user } = data.payload;

							// Don't render your own cursor
							if (user.id === userId) {
								return;
							}

							setCursors((prev) => {
								const newCursors = {
									...prev,
									[user.id]: data.payload,
								};

								return newCursors;
							});
						}
					)
					.subscribe();
			} catch (error) {
				console.error('[use-realtime-cursor] Failed to setup channel:', error);
			}
		};

		void setupChannel();

		return () => {
			isCleanedUp = true;
			channel?.unsubscribe();
			channelRef.current = null;
		};
	}, [roomName, userId, debug]);

	useEffect(() => {
		// Add event listener for mousemove on document but filter to ReactFlow area
		const handleMouseMoveFiltered = (event: MouseEvent) => {
			const reactFlowElement = document.querySelector('.react-flow');
			if (!reactFlowElement) return;

			// Check if event target is inside React Flow DOM tree (not just coords in bounds)
			// This correctly excludes overlays like share panel/modals even when they're
			// positioned over the canvas area
			if (!reactFlowElement.contains(event.target as Node)) return;

			handleMouseMove(event);
		};

		document.addEventListener('mousemove', handleMouseMoveFiltered);

		// Cleanup on unmount
		return () => {
			document.removeEventListener('mousemove', handleMouseMoveFiltered);
		};
	}, [handleMouseMove]);

	// Cleanup stale cursors periodically
	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			const now = Date.now();
			const STALE_THRESHOLD = 10000; // 10 seconds

			setCursors((prev) => {
				const filtered = Object.fromEntries(
					Object.entries(prev).filter(([_, cursor]) => {
						return now - cursor.timestamp < STALE_THRESHOLD;
					})
				);
				return filtered;
			});
		}, 5000); // Check every 5 seconds

		return () => clearInterval(cleanupInterval);
	}, []);

	return { cursors };
};
