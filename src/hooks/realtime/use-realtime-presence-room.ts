'use client';

import { useCurrentUserImage } from '@/hooks/use-current-user-image';
import { useCurrentUserName } from '@/hooks/use-current-username';
import { createPrivateChannel } from '@/lib/realtime/broadcast-channel';
import useAppStore from '@/store/mind-map-store';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { useUserColor } from '../use-user-color';

export type ActivityState =
	| 'idle'
	| 'editing'
	| 'dragging'
	| 'typing'
	| 'viewing';

export type RealtimeUser = {
	id: string;
	name: string;
	image: string;
	activityState?: ActivityState;
	joinedAt?: string; // ISO timestamp when user joined the session
	lastSeenAt?: string; // ISO timestamp of last activity
};

export const useRealtimePresenceRoom = (
	roomName: string,
	activityState?: ActivityState
) => {
	const currentUser = useAppStore((state) => state.currentUser);
	const { hex: color } = useUserColor(
		currentUser?.id || currentUser?.email || 'Anonymous'
	);
	const currentUserImage = useCurrentUserImage(color);
	const currentUserName = useCurrentUserName();

	const [users, setUsers] = useState<Record<string, RealtimeUser>>({});

	// Use refs to avoid stale closures in interval callback
	const currentUserNameRef = useRef(currentUserName);
	const currentUserImageRef = useRef(currentUserImage);
	const activityStateRef = useRef(activityState);
	const currentUserIdRef = useRef(currentUser?.id);

	// Keep refs in sync with latest values
	currentUserNameRef.current = currentUserName;
	currentUserImageRef.current = currentUserImage;
	activityStateRef.current = activityState;
	currentUserIdRef.current = currentUser?.id;

	useEffect(() => {
		let room: RealtimeChannel | null = null;
		let heartbeatInterval: NodeJS.Timeout | null = null;
		let isCleanedUp = false;
		const joinedAt = new Date().toISOString();

		// SECURITY: Use private channel with RLS authorization
		// This ensures only users with map access can see/track presence
		const setupPresence = async () => {
			try {
				room = await createPrivateChannel(roomName);
				if (isCleanedUp) {
					room.unsubscribe();
					return;
				}

				room
					.on('presence', { event: 'sync' }, () => {
						const newState = room!.presenceState<{
							id: string;
							image: string;
							name: string;
							joinedAt?: string;
							lastSeenAt?: string;
							activityState?: ActivityState;
						}>();

						const now = new Date().toISOString();

						const newUsers = Object.fromEntries(
							Object.entries(newState).map(([key, values]) => [
								key,
								{
									id: values[0].id,
									name: values[0].name,
									image: values[0].image,
									joinedAt: values[0].joinedAt,
									lastSeenAt: values[0].lastSeenAt || now,
									activityState: values[0].activityState || 'idle',
								},
							])
						) as Record<string, RealtimeUser>;
						setUsers(newUsers);
					})
					.subscribe((status) => {
						if (status !== 'SUBSCRIBED') {
							return;
						}

						// Initial track with error handling
						room!.track({
							id: currentUserIdRef.current,
							name: currentUserNameRef.current,
							image: currentUserImageRef.current,
							joinedAt,
							lastSeenAt: new Date().toISOString(),
							activityState: activityStateRef.current || 'viewing',
						}).catch((err) => {
							console.warn('[use-realtime-presence-room] Initial track failed:', err);
						});
					});

				// Update lastSeenAt and activityState every 30 seconds to keep presence fresh
				// Uses refs to always get the latest values without recreating the interval
				heartbeatInterval = setInterval(() => {
					if (room) {
						room.track({
							id: currentUserIdRef.current,
							name: currentUserNameRef.current,
							image: currentUserImageRef.current,
							joinedAt,
							lastSeenAt: new Date().toISOString(),
							activityState: activityStateRef.current || 'viewing',
						}).catch((err) => {
							console.warn('[use-realtime-presence-room] Heartbeat track failed:', err);
						});
					}
				}, 30000);
			} catch (error) {
				console.error('[use-realtime-presence-room] Failed to setup presence:', error);
			}
		};

		void setupPresence();

		return () => {
			isCleanedUp = true;
			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
			}
			room?.unsubscribe();
		};
	}, [roomName]); // Only depend on roomName - refs handle the rest

	return { users };
};
