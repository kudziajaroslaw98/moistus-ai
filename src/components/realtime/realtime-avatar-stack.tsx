'use client';

import { AvatarStack } from '@/components/ui/avatar-stack';
import {
	type ActivityState,
	useRealtimePresenceRoom,
} from '@/hooks/realtime/use-realtime-presence-room';
import useAppStore from '@/store/mind-map-store';
import { useMemo } from 'react';

interface RealtimeAvatarStackProps {
	roomName: string;
	activityState?: ActivityState;
	mapOwnerId?: string; // ID of the map owner to show role badges
	fallbackAvatars?: Array<{ image: string; name: string }>;
}

export const RealtimeAvatarStack = ({
	roomName,
	activityState,
	mapOwnerId,
	fallbackAvatars = [],
}: RealtimeAvatarStackProps) => {
	const currentUser = useAppStore((state) => state.currentUser);
	const { users: usersMap } = useRealtimePresenceRoom(roomName, activityState);
	const liveAvatars = useMemo(() => {
		if (!usersMap) return [];

		// Filter out current user - don't show yourself in the presence bar
		return Object.values(usersMap).filter(
			(user) => user.id !== currentUser?.id
		);
	}, [usersMap, currentUser?.id]);

	const avatars = liveAvatars.length > 0 ? liveAvatars : fallbackAvatars;

	return (
		<AvatarStack
			avatars={avatars}
			mapOwnerId={mapOwnerId}
			showProfileCard={true}
		/>
	);
};
