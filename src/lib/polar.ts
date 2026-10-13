import { createPolar, type Environment, type Polar } from '@polar-sh/sdk/2026-10';

/**
 * Polar environment: sandbox in development, production in production.
 */
export function getPolarEnvironment(): Environment {
	return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}

/**
 * Creates a Polar client pinned to API version 2026-10.
 * Keep the webhook endpoint's `api_version` in Polar aligned with this version:
 * webhook payloads are not schema-validated, only typed against it.
 *
 * @see https://polar.sh/docs/api-reference
 */
export function createPolarClient(): Polar {
	const accessToken = process.env.POLAR_ACCESS_TOKEN;

	if (!accessToken) {
		throw new Error('POLAR_ACCESS_TOKEN is not configured');
	}

	return createPolar({
		accessToken,
		environment: getPolarEnvironment(),
	});
}

/**
 * Gets the appropriate product ID based on billing interval.
 */
export function getProductId(billingInterval: 'monthly' | 'yearly'): string {
	const monthlyId = process.env.POLAR_PRO_MONTHLY_PRODUCT_ID;
	const yearlyId = process.env.POLAR_PRO_YEARLY_PRODUCT_ID;

	if (billingInterval === 'monthly') {
		if (!monthlyId) {
			throw new Error('POLAR_PRO_MONTHLY_PRODUCT_ID is not configured');
		}
		return monthlyId;
	}

	if (!yearlyId) {
		throw new Error('POLAR_PRO_YEARLY_PRODUCT_ID is not configured');
	}
	return yearlyId;
}

/**
 * Gets the app URL for redirects.
 */
export function getAppUrl(): string {
	return (
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: 'http://localhost:3000')
	);
}

/**
 * Maps Polar subscription status to our internal status.
 */
export function mapPolarStatus(
	polarStatus: string
): 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' {
	switch (polarStatus) {
		case 'active':
			return 'active';
		case 'trialing':
			return 'trialing';
		case 'past_due':
			return 'past_due';
		case 'canceled':
		case 'revoked':
			return 'canceled';
		case 'unpaid':
		// Paused subscriptions lose Pro access until `subscription.resumed`
		case 'paused':
			return 'unpaid';
		case 'incomplete':
		case 'incomplete_expired':
			return 'incomplete';
		default:
			// Unknown statuses should be treated as unpaid for security
			// This prevents granting access for undocumented/new Polar statuses
			console.warn(`[Polar] Unknown subscription status: ${polarStatus}`);
			return 'unpaid';
	}
}

/**
 * Maps Polar billing interval to our internal format.
 */
export function mapBillingInterval(
	interval: string
): 'monthly' | 'yearly' | 'weekly' | 'daily' {
	switch (interval.toLowerCase()) {
		case 'month':
			return 'monthly';
		case 'year':
			return 'yearly';
		case 'week':
			return 'weekly';
		case 'day':
			return 'daily';
		default:
			console.warn(`[Polar] Unknown billing interval: ${interval}`);
			return 'monthly';
	}
}
