import type {
	FormConflict,
	MergeStrategy,
	RealtimeFormFieldState,
	RealtimeFormState,
} from '@/hooks/realtime/use-realtime-form';
import { StateCreator } from 'zustand';
import { AppState, RealtimeSlice } from '../app-state';

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
		activeFields: {},
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
				activeFields: formState.activeFields || {},
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

	// Field locking methods
	lockFormField: (fieldName: string, userId: string) => {
		set((state) => ({
			formState: {
				...state.formState,
				activeFields: {
					...state.formState.activeFields,
					[fieldName]: userId,
				},
			},
		}));
	},

	unlockFormField: (fieldName: string) => {
		set((state) => {
			const { [fieldName]: _, ...remainingActiveFields } =
				state.formState.activeFields;
			return {
				formState: {
					...state.formState,
					activeFields: remainingActiveFields,
				},
			};
		});
	},

	isFormFieldLocked: (fieldName: string, currentUserId: string) => {
		const state = get();
		const lockedBy = state.formState.activeFields[fieldName];
		return Boolean(lockedBy && lockedBy !== currentUserId);
	},

	getFormFieldLocker: (fieldName: string) => {
		const state = get();
		return state.formState.activeFields[fieldName] || null;
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
				localField.version !== remoteField.version &&
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
				activeFields: {
					...localState.activeFields,
					...remoteState.activeFields,
				},
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
				activeFields: {},
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
		});
	},
});
