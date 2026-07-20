export interface SubscriptionActivationPoller {
	refreshSubscription: () => Promise<void>;
	isProUser: () => boolean;
	wait?: (delayMs: number) => Promise<void>;
	maxAttempts?: number;
	delayMs?: number;
}

const defaultWait = (delayMs: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, delayMs));

/**
 * Waits for the signed Polar webhook to persist Pro access before treating a
 * checkout return as activated. A checkout redirect alone is not proof of access.
 */
export async function waitForSubscriptionActivation({
	refreshSubscription,
	isProUser,
	wait = defaultWait,
	maxAttempts = 12,
	delayMs = 1000,
}: SubscriptionActivationPoller): Promise<boolean> {
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		await refreshSubscription();

		if (isProUser()) {
			return true;
		}

		if (attempt < maxAttempts - 1) {
			await wait(delayMs);
		}
	}

	return false;
}
