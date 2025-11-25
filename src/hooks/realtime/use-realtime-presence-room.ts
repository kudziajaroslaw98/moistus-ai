'use client';

import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { useCurrentUserImage } from '@/hooks/use-current-user-image';
import { useCurrentUserName } from '@/hooks/use-current-username';
import useAppStore from '@/store/mind-map-store';
import { useEffect, useState } from 'react';
import { useUserColor } from '../use-user-color';

const supabase = getSharedSupabaseClient();

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

	useEffect(() => {
		const room = supabase.channel(roomName);
		const joinedAt = new Date().toISOString();

		room
			.on('presence', { event: 'sync' }, () => {
				const newState = room.presenceState<{
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
			.subscribe(async (status) => {
				if (status !== 'SUBSCRIBED') {
					return;
				}

				await room.track({
					id: currentUser?.id,
					name: currentUserName,
					image: currentUserImage,
					joinedAt,
					lastSeenAt: new Date().toISOString(),
					activityState: activityState || 'viewing',
				});
			});

		// Update lastSeenAt and activityState every 30 seconds to keep presence fresh
		const heartbeatInterval = setInterval(async () => {
			await room.track({
				id: currentUser?.id,
				name: currentUserName,
				image: currentUserImage,
				joinedAt,
				lastSeenAt: new Date().toISOString(),
				activityState: activityState || 'viewing',
			});
		}, 30000);

		return () => {
			clearInterval(heartbeatInterval);
			room.unsubscribe();
		};
	}, [roomName, currentUserName, currentUserImage, currentUser?.id, activityState]);

	return { users };
};
