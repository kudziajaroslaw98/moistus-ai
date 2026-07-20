import { getProSignupHref, parseProCheckoutIntent } from './checkout-intent';

describe('Pro checkout intent', () => {
	it.each(['monthly', 'yearly'] as const)(
		'keeps the %s cadence from pricing through signup',
		(billingInterval) => {
			const params = new URLSearchParams({
				plan: 'pro',
				billingInterval,
			});

			expect(parseProCheckoutIntent(params)).toEqual({
				planId: 'pro',
				billingInterval,
			});
			expect(getProSignupHref(billingInterval)).toBe(
				`/auth/sign-up?plan=pro&billingInterval=${billingInterval}`
			);
		}
	);

	it.each([
		new URLSearchParams({ plan: 'free', billingInterval: 'monthly' }),
		new URLSearchParams({ plan: 'pro', billingInterval: 'weekly' }),
		new URLSearchParams({ plan: 'pro' }),
	])('rejects unsupported checkout input', (params) => {
		expect(parseProCheckoutIntent(params)).toBeNull();
	});
});
