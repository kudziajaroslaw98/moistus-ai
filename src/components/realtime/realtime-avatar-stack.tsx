'use client';

import { AvatarStack } from '@/components/ui/avatar-stack';
import {
	type ActivityState,
	useRealtimePresenceRoom,
} from '@/hooks/realtime/use-realtime-presence-room';
import { useMemo } from 'react';

interface RealtimeAvatarStackProps {
	roomName: string;
	activityState?: ActivityState;
	mapOwnerId?: string; // ID of the map owner to show role badges
}

export const RealtimeAvatarStack = ({
	roomName,
	activityState,
	mapOwnerId,
}: RealtimeAvatarStackProps) => {
	const { users: usersMap } = useRealtimePresenceRoom(roomName, activityState);
	const avatars = useMemo(() => {
		if (!usersMap) return [];

		// Pass full user objects for profile cards
		return Object.values(usersMap);
	}, [usersMap]);

	return (
		<AvatarStack
			avatars={avatars}
			mapOwnerId={mapOwnerId}
			showProfileCard={true}
		/>
	);
};
