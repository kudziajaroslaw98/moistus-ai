/**
 * Creates a debounced function that delays invoking func until after delay milliseconds
 * have elapsed since the last time the debounced function was invoked for a specific key.
 *
 * @param func The function to debounce.
 * @param delay The delay in milliseconds.
 * @param getKey A function that takes the arguments of func and returns a unique key (string or number).
 * @returns A debounced version of the function that operates per key.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debouncePerKey<T extends (...args: any[]) => any>(
	func: T,
	delay: number,
	getKey: (...args: Parameters<T>) => string | number
): (...args: Parameters<T>) => void {
	const timers: Record<string | number, NodeJS.Timeout> = {};

	return function (this: unknown, ...args: Parameters<T>) {
		const key = getKey(...args);

		if (timers[key]) {
			clearTimeout(timers[key]);
		}

		timers[key] = setTimeout(() => {
			func.apply(this, args);
			delete timers[key]; // Clean up the timer for this key once executed
		}, delay);
	};
}
