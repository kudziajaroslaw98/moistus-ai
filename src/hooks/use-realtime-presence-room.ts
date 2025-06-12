'use client';

import { createClient } from '@/helpers/supabase/client';
import { useCurrentUserImage } from '@/hooks/use-current-user-image';
import { useCurrentUserName } from '@/hooks/use-current-username';
import { useEffect, useState } from 'react';

const supabase = createClient();

export type RealtimeUser = {
	id: string;
	name: string;
	image: string;
};

export const useRealtimePresenceRoom = (roomName: string) => {
	const currentUserImage = useCurrentUserImage();
	const currentUserName = useCurrentUserName();

	const [users, setUsers] = useState<Record<string, RealtimeUser>>({});

	console.log(currentUserName, currentUserImage, roomName);

	useEffect(() => {
		const room = supabase.channel(roomName);

		room
			.on('presence', { event: 'sync' }, () => {
				const newState = room.presenceState<{ image: string; name: string }>();

				console.log(newState);

				const newUsers = Object.fromEntries(
					Object.entries(newState).map(([key, values]) => [
						key,
						{ name: values[0].name, image: values[0].image },
					])
				) as Record<string, RealtimeUser>;
				setUsers(newUsers);
			})
			.subscribe(async (status) => {
				if (status !== 'SUBSCRIBED') {
					return;
				}

				await room.track({
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
