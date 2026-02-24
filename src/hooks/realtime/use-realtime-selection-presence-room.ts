import { createPrivateChannel } from '@/lib/realtime/broadcast-channel';
import useAppStore from '@/store/mind-map-store';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useCurrentUserImage } from '../use-current-user-image';
import { useCurrentUserName } from '../use-current-username';

export type RealtimeUserSelection = {
	id: string;
	name: string;
	image: string;
	selectedNodes: string[];
};

export const useRealtimeSelectionPresenceRoom = (roomName: string) => {
	const currentUser = useAppStore((state) => state.currentUser);
	const currentUserImage = useCurrentUserImage();
	const currentUserName = useCurrentUserName();
	const setRealtimeSelectedNodes = useAppStore(
		(state) => state.setRealtimeSelectedNodes
	);

	const [users, setUsers] = useState<RealtimeUserSelection[]>([]);
	const selectedNodes = useAppStore((state) => state.selectedNodes);

	useEffect(() => {
		let room: RealtimeChannel | null = null;
		let isCleanedUp = false;

		// SECURITY: Use private channel with RLS authorization
		// This ensures only users with map access can see/track selections
		const setupSelectionPresence = async () => {
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
							name: string;
							image: string;
							selectedNodes: string[];
						}>();

						const newUsers = Object.entries(newState).map(([key, values]) => ({
							id: values[0].id,
							name: values[0].name,
							image: values[0].image,
							selectedNodes: values[0].selectedNodes,
						}));
						setUsers(newUsers);
						setRealtimeSelectedNodes(newUsers);
					})
					.subscribe(async (status) => {
						if (status !== 'SUBSCRIBED') {
							return;
						}

						await room!.track({
							id: currentUser?.id,
							name: currentUserName,
							image: currentUserImage,
							selectedNodes: selectedNodes.map((node) => node.data.id),
						});
					});
			} catch (error) {
				console.error('[use-realtime-selection-presence-room] Failed to setup presence:', error);
			}
		};

		void setupSelectionPresence();

		return () => {
			isCleanedUp = true;
			room?.unsubscribe();
		};
	}, [roomName, currentUserName, currentUserImage, selectedNodes]);

	return { users };
};
