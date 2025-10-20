'use client';

import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { useCurrentUserImage } from '@/hooks/use-current-user-image';
import { useCurrentUserName } from '@/hooks/use-current-username';
import useAppStore from '@/store/mind-map-store';
import { useEffect, useState } from 'react';
import { useUserColor } from '../use-user-color';

const supabase = getSharedSupabaseClient();

export type RealtimeUser = {
	id: string;
	name: string;
	image: string;
};

export const useRealtimePresenceRoom = (roomName: string) => {
	const currentUser = useAppStore((state) => state.currentUser);
	const { hex: color } = useUserColor(
		currentUser?.id || currentUser?.email || 'Anonymous'
	);
	const currentUserImage = useCurrentUserImage(color);
	const currentUserName = useCurrentUserName();

	const [users, setUsers] = useState<Record<string, RealtimeUser>>({});

	useEffect(() => {
		const room = supabase.channel(roomName);

		room
			.on('presence', { event: 'sync' }, () => {
				const newState = room.presenceState<{
					id: string;
					image: string;
					name: string;
				}>();

				const newUsers = Object.fromEntries(
					Object.entries(newState).map(([key, values]) => [
						key,
						{
							id: values[0].id,
							name: values[0].name,
							image: values[0].image,
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
				});
			});

		return () => {
			room.unsubscribe();
		};
	}, [roomName, currentUserName, currentUserImage]);

	return { users };
};
