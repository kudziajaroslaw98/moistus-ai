'use client';

import { AvatarStack } from '@/components/ui/avatar-stack';
import { useRealtimePresenceRoom } from '@/hooks/use-realtime-presence-room';
import { useMemo } from 'react';

export const RealtimeAvatarStack = ({ roomName }: { roomName: string }) => {
	const { users: usersMap } = useRealtimePresenceRoom(roomName);
	const avatars = useMemo(() => {
		if (!usersMap) return [];

		const avatars = Object.values(usersMap).map((user) => ({
			name: user.name,
			image: user.image,
		}));

		console.log(avatars);

		return avatars;
	}, [usersMap]);

	console.log(usersMap);

	return <AvatarStack avatars={avatars} />;
};
