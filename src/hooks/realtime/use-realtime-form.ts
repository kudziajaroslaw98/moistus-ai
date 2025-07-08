import useAppStore from '@/store/mind-map-store';
import type {
	MergeStrategy,
	RealtimeFormState,
} from '@/store/slices/realtime-slice';
import { debounce } from '@/utils/debounce';
import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';

// Re-export types for backward compatibility
export type {
	FormConflict,
	MergeStrategy,
	RealtimeFormFieldState,
	RealtimeFormState,
} from '@/store/slices/realtime-slice';

export function useRealtimeForm(
	roomName: string,
	mergeStrategy: MergeStrategy = 'newest-timestamp'
) {
	const {
		currentUser,
		userProfile,
		mapId,
		supabase,
		formState,
		enhancedFormState,
		updateFormField,
		mergeFormState,
		setFormConnectionStatus,
		setFormActiveUsers,
		resetFormState,
		hasFormConflicts,
		getFormConflicts,
		resolveFormConflict,
		trackFieldActivity,
		trackRemoteFieldActivity,
		getFieldActivity,
		getActiveUsersForField,
		fieldActivities,
	} = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
			userProfile: state.userProfile,
			mapId: state.mapId,
			supabase: state.supabase,
			formState: state.formState,
			enhancedFormState: state.enhancedFormState,
			updateFormField: state.updateFormField,
			mergeFormState: state.mergeFormState,
			setFormConnectionStatus: state.setFormConnectionStatus,
			setFormActiveUsers: state.setFormActiveUsers,
			resetFormState: state.resetFormState,
			hasFormConflicts: state.hasFormConflicts,
			getFormConflicts: state.getFormConflicts,
			resolveFormConflict: state.resolveFormConflict,
			trackFieldActivity: state.trackFieldActivity,
			trackRemoteFieldActivity: state.trackRemoteFieldActivity,
			getFieldActivity: state.getFieldActivity,
			getActiveUsersForField: state.getActiveUsersForField,
			fieldActivities: state.fieldActivities,
		}))
	);

	// Store room connection in ref to prevent subscription recreation
	const roomRef = useRef<any>(null);

	// Debounced broadcast function (stable)
	const debouncedBroadcast = useCallback(
		debounce((updates: Record<string, any>) => {
			const room = roomRef.current;
			if (!room || !currentUser?.id) return;

			room.send({
				type: 'broadcast',
				event: 'form_update',
				payload: {
					type: 'field_update',
					user_id: currentUser.id,
					map_id: mapId,
					updates,
					timestamp: Date.now(),
				},
			});
		}, 300),
		[currentUser?.id, mapId]
	);

	// 1. SUBSCRIPTION MANAGEMENT - Minimal dependencies, no state
	useEffect(() => {
		if (!supabase || !currentUser?.id || !mapId) {
			setFormConnectionStatus(false);
			return;
		}

		console.log(`[useRealtimeForm] Creating room subscription: ${roomName}`);

		const room = supabase.channel(roomName, {
			config: {
				presence: { key: currentUser.id },
				broadcast: { self: false, ack: false },
			},
		});

		// Store room in ref for other effects to use
		roomRef.current = room;

		// Subscribe and track presence
		room.subscribe(async (status: string) => {
			console.log(`[useRealtimeForm] Connection status: ${status}`);
			setFormConnectionStatus(status === 'SUBSCRIBED');

			if (status === 'SUBSCRIBED') {
				// Get current form state when subscribing (no dependency cascade)
				const currentFormState = useAppStore.getState().formState;
				await room.track(currentFormState);
			}
		});

		// Cleanup function
		return () => {
			console.log(
				`[useRealtimeForm] Cleaning up room subscription: ${roomName}`
			);
			roomRef.current = null;
			room.unsubscribe();
			setFormConnectionStatus(false);
		};
	}, [
		supabase,
		currentUser?.id,
		mapId,
		roomName,
		// ✅ Only connection parameters - no state dependencies
	]);

	// 2. PRESENCE EVENT HANDLERS - Separate effect
	useEffect(() => {
		const room = roomRef.current;
		if (!room || !currentUser?.id) return;

		const handlePresenceSync = () => {
			const presenceState = room.presenceState();
			const users = Object.keys(presenceState);

			console.log(`[useRealtimeForm] Presence sync - users: ${users.length}`);
			setFormActiveUsers(users);

			// Merge remote states
			if (users.length > 1) {
				const remoteStates = Object.values(presenceState).flat();
				remoteStates.forEach((remoteState: any) => {
					if (remoteState && remoteState.user_id !== currentUser.id) {
						mergeFormState(remoteState as RealtimeFormState, mergeStrategy);
					}
				});
			}
		};

		room.on('presence', { event: 'sync' }, handlePresenceSync);
	}, [
		currentUser?.id,
		mergeStrategy,
		mergeFormState,
		setFormActiveUsers,
		// ✅ Only dependencies needed for presence handling
	]);

	// 3. BROADCAST EVENT HANDLERS - Separate effect
	useEffect(() => {
		const room = roomRef.current;
		if (!room || !currentUser?.id) return;

		const handleFormUpdate = ({ payload }: { payload: any }) => {
			if (payload.user_id === currentUser.id) return; // Ignore own updates

			console.log(
				`[useRealtimeForm] Received form update from ${payload.user_id}`
			);

			// Use the complete field states directly from the broadcast
			const remoteFormState: RealtimeFormState = {
				user_id: payload.user_id,
				map_id: payload.map_id,
				fields: payload.updates, // Now contains complete RealtimeFormFieldState objects
				metadata: {
					lastSyncedAt: payload.timestamp,
					version: 1,
				},
			};

			mergeFormState(remoteFormState, mergeStrategy);
		};

		room.on('broadcast', { event: 'form_update' }, handleFormUpdate);
	}, [
		currentUser?.id,
		mergeStrategy,
		mergeFormState,
		// ✅ Only dependencies needed for broadcast handling
	]);

	// 4. FIELD ACTIVITY BROADCAST HANDLERS - Listen for field activity from other users
	useEffect(() => {
		const room = roomRef.current;
		if (!room || !currentUser?.id) return;

		const handleFieldActivity = ({ payload }: { payload: any }) => {
			if (payload.user_id === currentUser.id) return; // Ignore own activity

			console.log(
				`[useRealtimeForm] Received field activity from ${payload.user_id}: ${payload.type} on ${payload.field_name}`
			);

			// Update local field activity state based on remote user activity
			if (payload.user_profile) {
				trackRemoteFieldActivity(
					payload.field_name,
					payload.type,
					payload.user_id,
					payload.user_profile,
					payload.node_id
				);
			}
		};

		room.on('broadcast', { event: 'field_activity' }, handleFieldActivity);
	}, [currentUser?.id, trackFieldActivity]);

	// 5. FORM STATE INITIALIZATION - Separate effect
	useEffect(() => {
		if (currentUser?.id && mapId) {
			console.log(
				`[useRealtimeForm] Initializing form state for user ${currentUser.id}`
			);
			resetFormState(currentUser.id, mapId);
		}
	}, [currentUser?.id, mapId, resetFormState]);

	// Enhanced field update function
	const updateField = useCallback(
		(fieldName: string, value: any, nodeId?: string) => {
			if (!currentUser?.id) return;

			updateFormField(fieldName, value, currentUser.id);

			// Track field activity for editing
			trackFieldActivity(fieldName, 'edit', nodeId);

			// Create the complete field state for broadcasting
			const timestamp = Date.now();
			const currentField = formState.fields[fieldName];
			const newVersion = (currentField?.version || 0) + 1;

			debouncedBroadcast({
				[fieldName]: {
					value,
					lastModified: timestamp,
					lastModifiedBy: currentUser.id,
					version: newVersion,
				},
			});
		},
		[
			currentUser?.id,
			updateFormField,
			debouncedBroadcast,
			formState.fields,
			trackFieldActivity,
		]
	);

	// Field activity tracking functions
	const trackFieldFocus = useCallback(
		(fieldName: string, nodeId?: string) => {
			const room = roomRef.current;
			if (!currentUser?.id || !userProfile || !room) return;

			console.log(`[useRealtimeForm] Broadcasting field focus: ${fieldName}`);
			trackFieldActivity(fieldName, 'focus', nodeId);

			// Broadcast field activity to other users
			if (room) {
				room.send({
					type: 'broadcast',
					event: 'field_activity',
					payload: {
						type: 'focus',
						user_id: currentUser.id,
						map_id: mapId,
						field_name: fieldName,
						node_id: nodeId,
						timestamp: Date.now(),
						user_profile: {
							displayName: userProfile.displayName,
							avatarUrl: userProfile.avatarUrl || '',
							color: userProfile.color,
							isAnonymous: userProfile.isAnonymous,
						},
					},
				});
			}
		},
		[fieldActivities, currentUser?.id, userProfile, mapId]
	);

	const trackFieldBlur = useCallback(
		(fieldName: string, nodeId?: string) => {
			if (!currentUser?.id || !userProfile) return;

			console.log(`[useRealtimeForm] Broadcasting field blur: ${fieldName}`);
			trackFieldActivity(fieldName, 'blur', nodeId);

			// Broadcast field activity to other users
			const room = roomRef.current;

			if (room) {
				room.send({
					type: 'broadcast',
					event: 'field_activity',
					payload: {
						type: 'blur',
						user_id: currentUser.id,
						map_id: mapId,
						field_name: fieldName,
						node_id: nodeId,
						timestamp: Date.now(),
						user_profile: {
							displayName: userProfile.displayName,
							avatarUrl: userProfile.avatarUrl || '',
							color: userProfile.color,
							isAnonymous: userProfile.isAnonymous,
						},
					},
				});
			}
		},
		[fieldActivities, currentUser?.id, userProfile, mapId]
	);

	// Return enhanced API
	return {
		formState,
		updateField,
		isConnected: enhancedFormState.isConnected,
		activeUsers: enhancedFormState.activeUsers,
		conflicts: getFormConflicts(),
		hasConflicts: hasFormConflicts(),
		resolveConflict: resolveFormConflict,
		getFieldValue: (fieldName: string) => formState.fields[fieldName]?.value,
		getFieldState: (fieldName: string) => formState.fields[fieldName],

		// Field activity tracking methods
		trackFieldFocus,
		trackFieldBlur,
		getFieldActivity,
		getActiveUsersForField,
	};
}
