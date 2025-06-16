import useAppStore from '@/contexts/mind-map/mind-map-store';
import { createClient } from '@/helpers/supabase/client';
import { useEffect, useState } from 'react';
import { useCurrentUserImage } from './use-current-user-image';
import { useCurrentUserName } from './use-current-username';

const supabase = createClient();

export type RealtimeUserSelection = {
	id: string;
	name: string;
	image: string;
	selectedNodes: string[];
};

export const useRealtimeSelectionPresenceRoom = (roomName: string) => {
	const currentUserImage = useCurrentUserImage();
	const currentUserName = useCurrentUserName();
	const setRealtimeSelectedNodes = useAppStore(
		(state) => state.setRealtimeSelectedNodes
	);
	const currentUser = useAppStore((state) => state.currentUser);

	const [users, setUsers] = useState<RealtimeUserSelection[]>([]);
	const selectedNodes = useAppStore((state) => state.selectedNodes);

	useEffect(() => {
		const room = supabase.channel(roomName);

		room
			.on('presence', { event: 'sync' }, () => {
				const newState = room.presenceState<{
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
				console.log(status);
				if (status !== 'SUBSCRIBED') {
					return;
				}

				await room.track({
					id: currentUser?.id,
					name: currentUserName,
					image: currentUserImage,
					selectedNodes: selectedNodes.map((node) => node.data.id),
				});
			});

		return () => {
			room.unsubscribe();
		};
	}, [roomName, currentUserName, currentUserImage, selectedNodes]);

	return { users };
};
