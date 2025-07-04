'use client';

import { AvatarStack } from '@/components/ui/avatar-stack';
import { useRealtimePresenceRoom } from '@/hooks/realtime/use-realtime-presence-room';
import { useMemo } from 'react';

export const RealtimeAvatarStack = ({ roomName }: { roomName: string }) => {
	const { users: usersMap } = useRealtimePresenceRoom(roomName);
	const avatars = useMemo(() => {
		if (!usersMap) return [];

		const avatars = Object.values(usersMap).map((user) => ({
			id: user.id,
			name: user.name,
			image: user.image,
		}));

		return avatars;
	}, [usersMap]);

	return <AvatarStack avatars={avatars} />;
};
