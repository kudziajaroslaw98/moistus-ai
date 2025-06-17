import useAppStore from '@/store/mind-map-store';
import { debounce } from '@/utils/debounce';
import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

export interface RealtimeFormFieldState {
	value: any;
	lastModified: number;
	lastModifiedBy: string;
	version: number;
}

export interface RealtimeFormState {
	user_id: string;
	map_id: string;
	fields: Record<string, RealtimeFormFieldState>;
	activeFields: Record<string, string>; // fieldName -> userId
	metadata: {
		lastSyncedAt: number;
		version: number;
	};
}

export interface FormConflict {
	fieldName: string;
	localValue: any;
	remoteValue: any;
	localTimestamp: number;
	remoteTimestamp: number;
	localUser: string;
	remoteUser: string;
}

export type MergeStrategy =
	| 'last-writer-wins'
	| 'newest-timestamp'
	| 'manual'
	| 'field-level';

export interface RealtimeFormConfig {
	mergeStrategy?: MergeStrategy;
	debounceMs?: number;
	enableFieldLocking?: boolean;
	onConflict?: (conflict: FormConflict) => 'local' | 'remote' | 'merge';
	onFieldLocked?: (fieldName: string, lockedBy: string) => void;
	onFieldUnlocked?: (fieldName: string) => void;
	syncOnMount?: boolean;
}

interface UseRealtimeFormEnhancedReturn {
	formState: RealtimeFormState;
	updateField: (fieldName: string, value: any) => void;
	lockField: (fieldName: string) => void;
	unlockField: (fieldName: string) => void;
	isFieldLocked: (fieldName: string) => boolean;
	getFieldLocker: (fieldName: string) => string | null;
	forceSync: () => void;
	isConnected: boolean;
	activeUsers: string[];
	conflicts: FormConflict[];
	resolveConflict: (fieldName: string, resolution: 'local' | 'remote') => void;
}

export function useRealtimeForm(
	roomName: string,
	mergeStrategy: MergeStrategy = 'newest-timestamp'
) {
	const {
		currentUser,
		mapId,
		supabase,
		formState,
		enhancedFormState,
		updateFormField,
		lockFormField,
		unlockFormField,
		isFormFieldLocked,
		getFormFieldLocker,
		mergeFormState,
		setFormConnectionStatus,
		setFormActiveUsers,
		resetFormState,
		hasFormConflicts,
		getFormConflicts,
		resolveFormConflict,
	} = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
			mapId: state.mapId,
			supabase: state.supabase,
			formState: state.formState,
			enhancedFormState: state.enhancedFormState,
			updateFormField: state.updateFormField,
			lockFormField: state.lockFormField,
			unlockFormField: state.unlockFormField,
			isFormFieldLocked: state.isFormFieldLocked,
			getFormFieldLocker: state.getFormFieldLocker,
			mergeFormState: state.mergeFormState,
			setFormConnectionStatus: state.setFormConnectionStatus,
			setFormActiveUsers: state.setFormActiveUsers,
			resetFormState: state.resetFormState,
			hasFormConflicts: state.hasFormConflicts,
			getFormConflicts: state.getFormConflicts,
			resolveFormConflict: state.resolveFormConflict,
		}))
	);

	// Debounced broadcast function
	const debouncedBroadcast = useCallback(
		debounce((updates: Record<string, any>) => {
			const room = supabase.channel(roomName);
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

	// Initialize form state on mount
	useEffect(() => {
		if (currentUser?.id && mapId) {
			resetFormState(currentUser.id, mapId);
		}
	}, [currentUser?.id, mapId, resetFormState]);

	useEffect(() => {
		if (!supabase || !currentUser?.id || !mapId) return;

		const room = supabase.channel(roomName, {
			config: {
				presence: { key: currentUser.id },
				broadcast: { self: false, ack: false },
			},
		});

		// Handle presence sync
		room.on('presence', { event: 'sync' }, () => {
			const presenceState = room.presenceState<RealtimeFormState>();
			const users = Object.keys(presenceState);
			setFormActiveUsers(users);

			// Merge remote states
			if (users.length > 1) {
				const remoteStates = Object.values(presenceState).flat();
				remoteStates.forEach((remoteState) => {
					if (remoteState.user_id !== currentUser.id) {
						mergeFormState(remoteState, mergeStrategy);
					}
				});
			}
		});

		// Handle broadcast events
		room.on('broadcast', { event: 'form_update' }, ({ payload }) => {
			if (payload.user_id === currentUser.id) return; // Ignore own updates

			const remoteFormState: RealtimeFormState = {
				user_id: payload.user_id,
				map_id: payload.map_id,
				fields: payload.updates,
				activeFields: {},
				metadata: {
					lastSyncedAt: payload.timestamp,
					version: 1,
				},
			};

			mergeFormState(remoteFormState, mergeStrategy);
		});

		// Handle field lock events
		room.on('broadcast', { event: 'field_lock' }, ({ payload }) => {
			if (payload.user_id === currentUser.id) return;

			if (payload.action === 'lock') {
				lockFormField(payload.fieldName, payload.user_id);
			} else if (payload.action === 'unlock') {
				unlockFormField(payload.fieldName);
			}
		});

		// Subscribe and track presence
		room.subscribe(async (status) => {
			setFormConnectionStatus(status === 'SUBSCRIBED');

			if (status === 'SUBSCRIBED') {
				await room.track(formState);
			}
		});

		return () => {
			room.unsubscribe();
			setFormConnectionStatus(false);
		};
	}, [
		supabase,
		currentUser?.id,
		mapId,
		roomName,
		mergeStrategy,
		formState,
		mergeFormState,
		setFormConnectionStatus,
		setFormActiveUsers,
		lockFormField,
		unlockFormField,
	]);

	// Enhanced field update function
	const updateField = useCallback(
		(fieldName: string, value: any) => {
			if (!currentUser?.id) return;

			// Check if field is locked
			if (isFormFieldLocked(fieldName, currentUser.id)) {
				console.warn(`Field ${fieldName} is locked by another user`);
				return;
			}

			updateFormField(fieldName, value, currentUser.id);
			debouncedBroadcast({ [fieldName]: { value, timestamp: Date.now() } });
		},
		[currentUser?.id, isFormFieldLocked, updateFormField, debouncedBroadcast]
	);

	// Field locking helpers
	const lockField = useCallback(
		(fieldName: string) => {
			if (!currentUser?.id) return;
			lockFormField(fieldName, currentUser.id);
		},
		[currentUser?.id, lockFormField]
	);

	const unlockField = useCallback(
		(fieldName: string) => {
			unlockFormField(fieldName);
		},
		[unlockFormField]
	);

	const isFieldLocked = useCallback(
		(fieldName: string) => {
			return isFormFieldLocked(fieldName, currentUser?.id || '');
		},
		[isFormFieldLocked, currentUser?.id]
	);

	const getFieldLocker = useCallback(
		(fieldName: string) => {
			return getFormFieldLocker(fieldName);
		},
		[getFormFieldLocker]
	);

	// Return enhanced API
	return {
		formState,
		updateField,
		lockField,
		unlockField,
		isFieldLocked,
		getFieldLocker,
		isConnected: enhancedFormState.isConnected,
		activeUsers: enhancedFormState.activeUsers,
		conflicts: getFormConflicts(),
		hasConflicts: hasFormConflicts(),
		resolveConflict: resolveFormConflict,
		getFieldValue: (fieldName: string) => formState.fields[fieldName]?.value,
		getFieldState: (fieldName: string) => formState.fields[fieldName],
	};
}
