import { waitForSubscriptionActivation } from './wait-for-subscription-activation';

describe('waitForSubscriptionActivation', () => {
	it('waits for delayed webhook-created Pro access', async () => {
		let refreshCount = 0;
		const refreshSubscription = jest.fn(async () => {
			refreshCount += 1;
		});
		const wait = jest.fn(async () => undefined);

		const activated = await waitForSubscriptionActivation({
			refreshSubscription,
			isProUser: () => refreshCount >= 3,
			wait,
			maxAttempts: 4,
		});

		expect(activated).toBe(true);
		expect(refreshSubscription).toHaveBeenCalledTimes(3);
		expect(wait).toHaveBeenCalledTimes(2);
	});

	it('does not report activation before the webhook state is available', async () => {
		const refreshSubscription = jest.fn(async () => undefined);
		const wait = jest.fn(async () => undefined);

		const activated = await waitForSubscriptionActivation({
			refreshSubscription,
			isProUser: () => false,
			wait,
			maxAttempts: 3,
		});

		expect(activated).toBe(false);
		expect(refreshSubscription).toHaveBeenCalledTimes(3);
		expect(wait).toHaveBeenCalledTimes(2);
	});
});
