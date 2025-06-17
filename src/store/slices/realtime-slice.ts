import { StateCreator } from 'zustand';
import { AppState, RealtimeSlice } from '../app-state';

// Field Activity Interfaces
export interface FieldActivityUser {
	userId: string;
	displayName: string;
	avatarUrl: string;
	color: string;
	isAnonymous: boolean;
	lastActiveAt: number;
}

export interface FieldActivityState {
	fieldName: string;
	activeUsers: FieldActivityUser[];
	lastActivity: number;
	activityHistory: Array<{
		userId: string;
		timestamp: number;
		action: 'focus' | 'blur' | 'edit';
	}>;
}

export interface UserFieldPresence {
	userId: string;
	mapId: string;
	nodeId?: string;
	activeFields: Record<
		string,
		{
			focusedAt: number;
			lastEditAt: number;
			isActive: boolean;
			cursorPosition?: number;
		}
	>;
	lastSeen: number;
	userProfile: {
		displayName: string;
		avatarUrl: string;
		color: string;
		isAnonymous: boolean;
	};
}

export type MergeStrategy =
	| 'last-writer-wins'
	| 'newest-timestamp'
	| 'manual'
	| 'field-level';

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

export const createRealtimeSlice: StateCreator<
	AppState,
	[],
	[],
	RealtimeSlice
> = (set, get) => ({
	// state
	realtimeSelectedNodes: [],
	formState: {
		user_id: '',
		map_id: '',
		fields: {},
		metadata: {
			lastSyncedAt: Date.now(),
			version: 1,
		},
	},

	// Enhanced form state
	enhancedFormState: {
		isConnected: false,
		activeUsers: [],
		conflicts: [],
		pendingUpdates: {},
		optimisticUpdates: {},
	},

	// Field activity state
	fieldActivities: {},
	userFieldPresences: {},

	// Basic setters (maintaining compatibility)
	setRealtimeSelectedNodes: (nodes) => {
		set({ realtimeSelectedNodes: nodes });
	},
	setFormState: (formState: Record<string, any>) => {
		set({
			formState: {
				user_id: formState.user_id || '',
				map_id: formState.map_id || '',
				fields: formState.fields || {},
				metadata: formState.metadata || {
					lastSyncedAt: Date.now(),
					version: 1,
				},
			},
		});
	},

	// Enhanced form state management
	updateFormField: (fieldName: string, value: any, userId: string) => {
		const state = get();
		const timestamp = Date.now();
		const currentField = state.formState.fields[fieldName];

		const newFieldState: RealtimeFormFieldState = {
			value,
			lastModified: timestamp,
			lastModifiedBy: userId,
			version: (currentField?.version || 0) + 1,
		};

		set((state) => ({
			formState: {
				...state.formState,
				fields: {
					...state.formState.fields,
					[fieldName]: newFieldState,
				},
				metadata: {
					...state.formState.metadata,
					lastSyncedAt: timestamp,
					version: state.formState.metadata.version + 1,
				},
			},
		}));
	},

	// Conflict management
	addFormConflict: (conflict: FormConflict) => {
		set((state) => ({
			enhancedFormState: {
				...state.enhancedFormState,
				conflicts: [...state.enhancedFormState.conflicts, conflict],
			},
		}));
	},

	resolveFormConflict: (fieldName: string, resolution: 'local' | 'remote') => {
		set((state) => {
			const conflict = state.enhancedFormState.conflicts.find(
				(c) => c.fieldName === fieldName
			);
			if (!conflict) return state;

			let updatedFormState = state.formState;

			if (resolution === 'remote') {
				updatedFormState = {
					...state.formState,
					fields: {
						...state.formState.fields,
						[fieldName]: {
							value: conflict.remoteValue,
							lastModified: conflict.remoteTimestamp,
							lastModifiedBy: conflict.remoteUser,
							version: (state.formState.fields[fieldName]?.version || 0) + 1,
						},
					},
				};
			}

			return {
				formState: updatedFormState,
				enhancedFormState: {
					...state.enhancedFormState,
					conflicts: state.enhancedFormState.conflicts.filter(
						(c) => c.fieldName !== fieldName
					),
				},
			};
		});
	},

	clearFormConflicts: () => {
		set((state) => ({
			enhancedFormState: {
				...state.enhancedFormState,
				conflicts: [],
			},
		}));
	},

	// Connection and user management
	setFormConnectionStatus: (isConnected: boolean) => {
		set((state) => ({
			enhancedFormState: {
				...state.enhancedFormState,
				isConnected,
			},
		}));
	},

	setFormActiveUsers: (users: string[]) => {
		set((state) => ({
			enhancedFormState: {
				...state.enhancedFormState,
				activeUsers: users,
			},
		}));
	},

	// Form state merging with conflict detection
	mergeFormState: (
		remoteState: RealtimeFormState,
		strategy: MergeStrategy = 'newest-timestamp'
	) => {
		const state = get();
		const localState = state.formState;
		const newConflicts: FormConflict[] = [];

		const mergedFields = { ...localState.fields };

		Object.entries(remoteState.fields).forEach(([fieldName, remoteField]) => {
			const localField = localState.fields[fieldName];

			if (!localField) {
				// Field doesn't exist locally, add it
				mergedFields[fieldName] = remoteField;
				return;
			}

			// Check for conflicts
			if (
				localField.version !== remoteField.version ||
				localField.lastModified !== remoteField.lastModified
			) {
				const conflict: FormConflict = {
					fieldName,
					localValue: localField.value,
					remoteValue: remoteField.value,
					localTimestamp: localField.lastModified,
					remoteTimestamp: remoteField.lastModified,
					localUser: localField.lastModifiedBy,
					remoteUser: remoteField.lastModifiedBy,
				};

				// Apply merge strategy
				switch (strategy) {
					case 'newest-timestamp':
						if (remoteField.lastModified > localField.lastModified) {
							mergedFields[fieldName] = remoteField;
						}
						break;
					case 'last-writer-wins':
						if (remoteField.version > localField.version) {
							mergedFields[fieldName] = remoteField;
						}
						break;
					case 'manual':
						newConflicts.push(conflict);
						break;
					case 'field-level':
						// Fallback to newest-timestamp for field-level
						if (remoteField.lastModified > localField.lastModified) {
							mergedFields[fieldName] = remoteField;
						}
						break;
				}
			} else if (remoteField.lastModified > localField.lastModified) {
				// No version conflict, but remote is newer
				mergedFields[fieldName] = remoteField;
			}
		});

		// Update state with merged data and conflicts
		set((state) => ({
			formState: {
				...localState,
				fields: mergedFields,
				metadata: {
					lastSyncedAt: Date.now(),
					version:
						Math.max(
							localState.metadata.version,
							remoteState.metadata.version
						) + 1,
				},
			},
			enhancedFormState: {
				...state.enhancedFormState,
				conflicts: [...state.enhancedFormState.conflicts, ...newConflicts],
			},
		}));
	},

	// Utility methods
	getFormFieldValue: (fieldName: string) => {
		const state = get();
		return state.formState.fields[fieldName]?.value;
	},

	getFormFieldState: (fieldName: string) => {
		const state = get();
		return state.formState.fields[fieldName] || null;
	},

	hasFormConflicts: () => {
		const state = get();
		return state.enhancedFormState.conflicts.length > 0;
	},

	getFormConflicts: () => {
		const state = get();
		return state.enhancedFormState.conflicts;
	},

	resetFormState: (userId: string, mapId: string) => {
		set({
			formState: {
				user_id: userId,
				map_id: mapId,
				fields: {},
				metadata: {
					lastSyncedAt: Date.now(),
					version: 1,
				},
			},
			enhancedFormState: {
				isConnected: false,
				activeUsers: [],
				conflicts: [],
				pendingUpdates: {},
				optimisticUpdates: {},
			},
			fieldActivities: {},
			userFieldPresences: {},
		});
	},

	// Field activity tracking methods
	trackFieldActivity: (
		fieldName: string,
		action: 'focus' | 'blur' | 'edit',
		nodeId?: string
	) => {
		const {
			currentUser,
			userProfile,
			mapId,
			userFieldPresences,
			fieldActivities,
		} = get();

		if (!currentUser || !userProfile) return;

		const timestamp = Date.now();
		const userId = currentUser.id;

		// Update user field presence
		const currentPresence = userFieldPresences[userId] || {
			userId,
			mapId: mapId || '',
			nodeId,
			activeFields: {},
			lastSeen: timestamp,
			userProfile: {
				displayName: userProfile.displayName,
				avatarUrl: userProfile.avatarUrl || '',
				color: userProfile.color.hex,
				isAnonymous: userProfile.isAnonymous,
			},
		};

		const updatedPresence: UserFieldPresence = {
			...currentPresence,
			nodeId: nodeId || currentPresence.nodeId,
			lastSeen: timestamp,
			activeFields: {
				...currentPresence.activeFields,
				[fieldName]: {
					focusedAt:
						action === 'focus'
							? timestamp
							: currentPresence.activeFields[fieldName]?.focusedAt || timestamp,
					lastEditAt:
						action === 'edit'
							? timestamp
							: currentPresence.activeFields[fieldName]?.lastEditAt || 0,
					isActive: action !== 'blur',
					cursorPosition:
						currentPresence.activeFields[fieldName]?.cursorPosition,
				},
			},
		};

		// Update field activity state
		const currentFieldActivity = fieldActivities[fieldName] || {
			fieldName,
			activeUsers: [],
			lastActivity: timestamp,
			activityHistory: [],
		};

		const fieldActivityUser: FieldActivityUser = {
			userId,
			displayName: userProfile.displayName,
			avatarUrl: userProfile.avatarUrl || '',
			color: userProfile.color.hex,
			isAnonymous: userProfile.isAnonymous,
			lastActiveAt: timestamp,
		};

		const updatedActiveUsers =
			action === 'blur'
				? currentFieldActivity.activeUsers.filter(
						(user) => user.userId !== userId
					)
				: [
						...currentFieldActivity.activeUsers.filter(
							(user) => user.userId !== userId
						),
						fieldActivityUser,
					];

		const updatedFieldActivity: FieldActivityState = {
			...currentFieldActivity,
			activeUsers: updatedActiveUsers,
			lastActivity: timestamp,
			activityHistory: [
				...currentFieldActivity.activityHistory.slice(-49), // Keep last 50 activities
				{
					userId,
					timestamp,
					action,
				},
			],
		};

		set((state) => ({
			userFieldPresences: {
				...state.userFieldPresences,
				[userId]: updatedPresence,
			},
			fieldActivities: {
				...state.fieldActivities,
				[fieldName]: updatedFieldActivity,
			},
		}));
	},

	// Handle field activity from remote users
	trackRemoteFieldActivity: (
		fieldName: string,
		action: 'focus' | 'blur' | 'edit',
		remoteUserId: string,
		remoteUserProfile: {
			displayName: string;
			avatarUrl: string;
			color: string;
			isAnonymous: boolean;
		},
		nodeId?: string
	) => {
		const { mapId, fieldActivities } = get();

		const timestamp = Date.now();

		// Update field activity state for remote user
		const currentFieldActivity = fieldActivities[fieldName] || {
			fieldName,
			activeUsers: [],
			lastActivity: timestamp,
			activityHistory: [],
		};

		const fieldActivityUser: FieldActivityUser = {
			userId: remoteUserId,
			displayName: remoteUserProfile.displayName,
			avatarUrl: remoteUserProfile.avatarUrl,
			color: remoteUserProfile.color,
			isAnonymous: remoteUserProfile.isAnonymous,
			lastActiveAt: timestamp,
		};

		const updatedActiveUsers =
			action === 'blur'
				? currentFieldActivity.activeUsers.filter(
						(user) => user.userId !== remoteUserId
					)
				: [
						...currentFieldActivity.activeUsers.filter(
							(user) => user.userId !== remoteUserId
						),
						fieldActivityUser,
					];

		const updatedFieldActivity: FieldActivityState = {
			...currentFieldActivity,
			activeUsers: updatedActiveUsers,
			lastActivity: timestamp,
			activityHistory: [
				...currentFieldActivity.activityHistory.slice(-49), // Keep last 50 activities
				{
					userId: remoteUserId,
					timestamp,
					action,
				},
			],
		};

		set((state) => ({
			fieldActivities: {
				...state.fieldActivities,
				[fieldName]: updatedFieldActivity,
			},
		}));
	},

	getFieldActivity: (fieldName: string) => {
		const { fieldActivities } = get();
		return fieldActivities[fieldName] || null;
	},

	getActiveUsersForField: (fieldName: string) => {
		const { fieldActivities } = get();
		const fieldActivity = fieldActivities[fieldName];
		return fieldActivity?.activeUsers || [];
	},

	clearFieldActivity: () => {
		set({
			fieldActivities: {},
			userFieldPresences: {},
		});
	},

	updateUserFieldPresence: (presence: Partial<UserFieldPresence>) => {
		const { userFieldPresences } = get();
		const userId = presence.userId;

		if (!userId) return;

		const currentPresence = userFieldPresences[userId];
		const updatedPresence = {
			...currentPresence,
			...presence,
			lastSeen: Date.now(),
		} as UserFieldPresence;

		set((state) => ({
			userFieldPresences: {
				...state.userFieldPresences,
				[userId]: updatedPresence,
			},
		}));
	},

	getUserFieldPresence: (userId: string) => {
		const { userFieldPresences } = get();
		return userFieldPresences[userId] || null;
	},
});
