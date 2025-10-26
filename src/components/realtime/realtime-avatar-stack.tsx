'use client';

import { AvatarStack } from '@/components/ui/avatar-stack';
import { useRealtimePresenceRoom } from '@/hooks/realtime/use-realtime-presence-room';
import { useMemo } from 'react';

export const RealtimeAvatarStack = ({ roomName }: { roomName: string }) => {
	const { users: usersMap } = useRealtimePresenceRoom(roomName);
	const avatars = useMemo(() => {
		if (!usersMap) return [];

		// Pass full user objects for profile cards
		return Object.values(usersMap);
	}, [usersMap]);

	return <AvatarStack avatars={avatars} showProfileCard={true} />;
};
