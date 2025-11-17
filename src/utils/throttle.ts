/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * Unlike debounce, throttle ensures the function is called at a steady rate.
 *
 * Use case: Rate-limiting API calls to prevent spam while allowing immediate first execution.
 *
 * @param func The function to throttle
 * @param wait The minimum time between function invocations in milliseconds
 * @returns A throttled version of the function
 *
 * @example
 * const throttledApiCall = throttle(callApi, 3000);
 * throttledApiCall(); // Executes immediately
 * throttledApiCall(); // Ignored (within 3s window)
 * // ... 3000ms later
 * throttledApiCall(); // Executes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let lastExecutionTime = 0;
	let timeoutId: NodeJS.Timeout | null = null;

	return function (this: unknown, ...args: Parameters<T>) {
		const now = Date.now();
		const timeSinceLastExecution = now - lastExecutionTime;

		// If enough time has passed, execute immediately
		if (timeSinceLastExecution >= wait) {
			lastExecutionTime = now;
			func.apply(this, args);
		} else {
			// Otherwise, schedule execution for when the throttle period ends
			// This ensures we don't lose the last call
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			const remainingTime = wait - timeSinceLastExecution;
			timeoutId = setTimeout(() => {
				lastExecutionTime = Date.now();
				func.apply(this, args);
				timeoutId = null;
			}, remainingTime);
		}
	};
}

/**
 * Creates a throttled function with leading edge only (no trailing execution).
 * Calls that occur within the throttle window are completely ignored.
 *
 * Use case: Strict rate limiting where we only want the first call in each window.
 *
 * @param func The function to throttle
 * @param wait The minimum time between function invocations in milliseconds
 * @returns A throttled version of the function
 *
 * @example
 * const throttledAction = throttleLeading(performAction, 1000);
 * throttledAction(); // Executes immediately
 * throttledAction(); // Ignored
 * throttledAction(); // Ignored
 * // ... 1000ms later
 * throttledAction(); // Executes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttleLeading<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let lastExecutionTime = 0;

	return function (this: unknown, ...args: Parameters<T>) {
		const now = Date.now();
		const timeSinceLastExecution = now - lastExecutionTime;

		if (timeSinceLastExecution >= wait) {
			lastExecutionTime = now;
			func.apply(this, args);
		}
		// Silently ignore calls within throttle window
	};
}
