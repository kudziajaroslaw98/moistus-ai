/**
 * Creates a debounced function that delays invoking func until after delay milliseconds
 * have elapsed since the last time the debounced function was invoked for a specific key.
 *
 * @param func The function to debounce.
 * @param delay The delay in milliseconds.
 * @param getKey A function that takes the arguments of func and returns a unique key (string or number).
 * @returns A debounced version of the function that operates per key.
 */
export type DebouncedPerKeyFn<T extends (...args: any[]) => any> = ((...args: Parameters<T>) => void) & {
	flush: (key: string | number) => Promise<void>;
	flushAll: () => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debouncePerKey<T extends (...args: any[]) => any>(
	func: T,
	delay: number,
	getKey: (...args: Parameters<T>) => string | number
): DebouncedPerKeyFn<T> {
	type PendingEntry = {
		timer: ReturnType<typeof setTimeout>;
		args: Parameters<T>;
		context: unknown;
	};

	const pendingByKey = new Map<string | number, PendingEntry>();

	const invoke = async (
		context: unknown,
		args: Parameters<T>
	): Promise<void> => {
		await Promise.resolve(func.apply(context, args));
	};

	const flush = async (key: string | number): Promise<void> => {
		const pending = pendingByKey.get(key);
		if (!pending) return;

		clearTimeout(pending.timer);
		pendingByKey.delete(key);
		await invoke(pending.context, pending.args);
	};

	const flushAll = async (): Promise<void> => {
		const keys = Array.from(pendingByKey.keys());
		for (const key of keys) {
			await flush(key);
		}
	};

	const debounced = function (this: unknown, ...args: Parameters<T>) {
		const key = getKey(...args);
		const existing = pendingByKey.get(key);
		if (existing) {
			clearTimeout(existing.timer);
		}

		const timer = setTimeout(() => {
			const pending = pendingByKey.get(key);
			if (!pending) return;
			pendingByKey.delete(key);
			void invoke(pending.context, pending.args);
		}, delay);

		pendingByKey.set(key, {
			timer,
			args,
			context: this,
		});
	} as DebouncedPerKeyFn<T>;

	debounced.flush = flush;
	debounced.flushAll = flushAll;

	return debounced;
}
