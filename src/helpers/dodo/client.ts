import DodoPayments from 'dodopayments';

/**
 * Creates a Dodo Payments client instance.
 * Uses test_mode in development, live_mode in production.
 */
export function createDodoClient() {
	const apiKey = process.env.DODO_PAYMENTS_API_KEY;

	if (!apiKey) {
		throw new Error('DODO_PAYMENTS_API_KEY is not configured');
	}

	const environment =
		(process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode') ||
		(process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode');

	return new DodoPayments({
		bearerToken: apiKey,
		environment,
	});
}

/**
 * Gets the appropriate product ID based on billing interval.
 */
export function getProductId(billingInterval: 'monthly' | 'yearly'): string {
	const monthlyId = process.env.DODO_PRO_MONTHLY_PRODUCT_ID;
	const yearlyId = process.env.DODO_PRO_ANNUALLY_PRODUCT_ID;

	if (billingInterval === 'monthly') {
		if (!monthlyId) {
			throw new Error('DODO_PRO_MONTHLY_PRODUCT_ID is not configured');
		}
		return monthlyId;
	}

	if (!yearlyId) {
		throw new Error('DODO_PRO_ANNUALLY_PRODUCT_ID is not configured');
	}
	return yearlyId;
}

/**
 * Gets the app URL for redirects.
 */
export function getAppUrl(): string {
	return (
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
	);
}
