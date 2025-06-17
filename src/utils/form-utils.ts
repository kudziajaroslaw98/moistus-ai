import { omit } from './omit';
import type { RealtimeFormState, RealtimeFormFieldState } from '@/hooks/realtime/use-realtime-form-enhanced';

/**
 * Extracts only the values from a form state, omitting metadata
 */
export function extractFormValues(formState: RealtimeFormState): Record<string, any> {
	const values: Record<string, any> = {};

	Object.entries(formState.fields).forEach(([fieldName, fieldState]) => {
		values[fieldName] = fieldState.value;
	});

	return values;
}

/**
 * Creates a sanitized form state for transmission, omitting sensitive fields
 */
export function sanitizeFormStateForBroadcast(
	formState: RealtimeFormState,
	excludeFields: string[] = []
): Partial<RealtimeFormState> {
	const sanitized = omit(formState, ['user_id'] as any);

	if (excludeFields.length > 0) {
		sanitized.fields = omit(sanitized.fields, excludeFields as any);
	}

	return sanitized;
}

/**
 * Extracts form values while excluding specified fields
 */
export function extractFormValuesExcluding(
	formState: RealtimeFormState,
	excludeFields: string[]
): Record<string, any> {
	const allValues = extractFormValues(formState);
	return omit(allValues, excludeFields as any);
}

/**
 * Creates a form state diff showing only changed fields
 */
export function createFormStateDiff(
	previousState: RealtimeFormState,
	currentState: RealtimeFormState
): Record<string, RealtimeFormFieldState> {
	const changes: Record<string, RealtimeFormFieldState> = {};

	Object.entries(currentState.fields).forEach(([fieldName, fieldState]) => {
		const previousField = previousState.fields[fieldName];

		if (!previousField ||
			previousField.value !== fieldState.value ||
			previousField.version !== fieldState.version) {
			changes[fieldName] = fieldState;
		}
	});

	return changes;
}

/**
 * Merges form values into existing form state while preserving metadata
 */
export function mergeFormValues(
	existingState: RealtimeFormState,
	newValues: Record<string, any>,
	userId: string
): RealtimeFormState {
	const timestamp = Date.now();
	const updatedFields: Record<string, RealtimeFormFieldState> = { ...existingState.fields };

	Object.entries(newValues).forEach(([fieldName, value]) => {
		const existingField = updatedFields[fieldName];
		updatedFields[fieldName] = {
			value,
			lastModified: timestamp,
			lastModifiedBy: userId,
			version: (existingField?.version || 0) + 1,
		};
	});

	return {
		...existingState,
		fields: updatedFields,
		metadata: {
			...existingState.metadata,
			lastSyncedAt: timestamp,
			version: existingState.metadata.version + 1,
		},
	};
}

/**
 * Validates form state structure and returns validation errors
 */
export function validateFormState(formState: any): string[] {
	const errors: string[] = [];

	if (!formState) {
		errors.push('Form state is required');
		return errors;
	}

	if (!formState.user_id) {
		errors.push('User ID is required');
	}

	if (!formState.map_id) {
		errors.push('Map ID is required');
	}

	if (!formState.fields || typeof formState.fields !== 'object') {
		errors.push('Fields object is required');
	} else {
		Object.entries(formState.fields).forEach(([fieldName, fieldState]: [string, any]) => {
			if (!fieldState) {
				errors.push(`Field "${fieldName}" state is invalid`);
				return;
			}

			if (fieldState.lastModified === undefined || fieldState.lastModified === null) {
				errors.push(`Field "${fieldName}" missing lastModified timestamp`);
			}

			if (!fieldState.lastModifiedBy) {
				errors.push(`Field "${fieldName}" missing lastModifiedBy user`);
			}

			if (fieldState.version === undefined || fieldState.version === null) {
				errors.push(`Field "${fieldName}" missing version`);
			}
		});
	}

	if (!formState.metadata) {
		errors.push('Metadata is required');
	} else {
		if (!formState.metadata.lastSyncedAt) {
			errors.push('Metadata missing lastSyncedAt');
		}
		if (!formState.metadata.version) {
			errors.push('Metadata missing version');
		}
	}

	return errors;
}

/**
 * Creates a minimal form state for initial sync
 */
export function createInitialFormState(
	userId: string,
	mapId: string,
	initialValues: Record<string, any> = {}
): RealtimeFormState {
	const timestamp = Date.now();
	const fields: Record<string, RealtimeFormFieldState> = {};

	Object.entries(initialValues).forEach(([fieldName, value]) => {
		fields[fieldName] = {
			value,
			lastModified: timestamp,
			lastModifiedBy: userId,
			version: 1,
		};
	});

	return {
		user_id: userId,
		map_id: mapId,
		fields,
		activeFields: {},
		metadata: {
			lastSyncedAt: timestamp,
			version: 1,
		},
	};
}

/**
 * Filters form state to only include specified fields
 */
export function filterFormStateFields(
	formState: RealtimeFormState,
	includeFields: string[]
): RealtimeFormState {
	const filteredFields: Record<string, RealtimeFormFieldState> = {};

	includeFields.forEach(fieldName => {
		if (formState.fields[fieldName]) {
			filteredFields[fieldName] = formState.fields[fieldName];
		}
	});

	return {
		...formState,
		fields: filteredFields,
	};
}

/**
 * Gets a summary of form state for debugging
 */
export function getFormStateSummary(formState: RealtimeFormState): {
	fieldCount: number;
	activeFieldCount: number;
	lastModified: number;
	version: number;
	fieldSummary: Array<{
		name: string;
		hasValue: boolean;
		lastModified: number;
		version: number;
		modifiedBy: string;
	}>;
} {
	const fieldSummary = Object.entries(formState.fields).map(([name, field]) => ({
		name,
		hasValue: field.value !== undefined && field.value !== null && field.value !== '',
		lastModified: field.lastModified,
		version: field.version,
		modifiedBy: field.lastModifiedBy,
	}));

	const lastModified = Math.max(
		...Object.values(formState.fields).map(f => f.lastModified),
		formState.metadata.lastSyncedAt
	);

	return {
		fieldCount: Object.keys(formState.fields).length,
		activeFieldCount: Object.keys(formState.activeFields).length,
		lastModified,
		version: formState.metadata.version,
		fieldSummary,
	};
}

/**
 * Checks if two form states are equivalent (ignoring timestamps)
 */
export function areFormStatesEquivalent(
	state1: RealtimeFormState,
	state2: RealtimeFormState,
	ignoreTimestamps: boolean = false
): boolean {
	if (state1.user_id !== state2.user_id || state1.map_id !== state2.map_id) {
		return false;
	}

	const fields1 = Object.keys(state1.fields).sort();
	const fields2 = Object.keys(state2.fields).sort();

	if (fields1.length !== fields2.length) {
		return false;
	}

	for (let i = 0; i < fields1.length; i++) {
		if (fields1[i] !== fields2[i]) {
			return false;
		}

		const field1 = state1.fields[fields1[i]];
		const field2 = state2.fields[fields2[i]];

		if (field1.value !== field2.value) {
			return false;
		}

		if (!ignoreTimestamps) {
			if (field1.lastModified !== field2.lastModified ||
				field1.version !== field2.version ||
				field1.lastModifiedBy !== field2.lastModifiedBy) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Creates a deep clone of form state
 */
export function cloneFormState(formState: RealtimeFormState): RealtimeFormState {
	return {
		user_id: formState.user_id,
		map_id: formState.map_id,
		fields: Object.fromEntries(
			Object.entries(formState.fields).map(([key, field]) => [
				key,
				{
					value: typeof field.value === 'object' && field.value !== null
						? JSON.parse(JSON.stringify(field.value))
						: field.value,
					lastModified: field.lastModified,
					lastModifiedBy: field.lastModifiedBy,
					version: field.version,
				},
			])
		),
		activeFields: { ...formState.activeFields },
		metadata: { ...formState.metadata },
	};
}

/**
 * Serializes form state for storage or transmission
 */
export function serializeFormState(formState: RealtimeFormState): string {
	return JSON.stringify(formState);
}

/**
 * Deserializes form state from storage or transmission
 */
export function deserializeFormState(serialized: string): RealtimeFormState | null {
	try {
		const parsed = JSON.parse(serialized);
		const errors = validateFormState(parsed);

		if (errors.length > 0) {
			console.error('Invalid form state structure:', errors);
			return null;
		}

		return parsed;
	} catch (error) {
		console.error('Failed to deserialize form state:', error);
		return null;
	}
}
