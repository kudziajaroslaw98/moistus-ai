/**
 * Creates a new object with the specified keys omitted.
 *
 * @param obj The source object
 * @param keys The key or keys to omit from the object
 * @returns A new object with the specified keys removed
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
	obj: T,
	keys: K | K[]
): Omit<T, K> {
	if (!obj || typeof obj !== 'object') {
		return obj as Omit<T, K>;
	}

	const keysToOmit = Array.isArray(keys) ? keys : [keys];
	const result = {} as Omit<T, K>;

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key) && !keysToOmit.includes(key as K)) {
			(result as any)[key] = obj[key];
		}
	}

	return result;
}
