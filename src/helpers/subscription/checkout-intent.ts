import {
	PRO_PLAN_ID,
	type BillingInterval,
	type ProCheckoutIntent,
} from '@/types/subscription';

export { PRO_PLAN_ID, type BillingInterval, type ProCheckoutIntent };

type SearchParamsReader = Pick<URLSearchParams, 'get'>;

/**
 * Returns a checkout intent only for the supported public Pro signup flow.
 * Unknown query parameters must never become billable checkout input.
 */
export function parseProCheckoutIntent(
	searchParams: SearchParamsReader
): ProCheckoutIntent | null {
	const plan = searchParams.get('plan');
	const billingInterval = searchParams.get('billingInterval');

	if (
		plan !== PRO_PLAN_ID ||
		(billingInterval !== 'monthly' && billingInterval !== 'yearly')
	) {
		return null;
	}

	return {
		planId: PRO_PLAN_ID,
		billingInterval,
	};
}

export function getProSignupHref(billingInterval: BillingInterval): string {
	return `/auth/sign-up?plan=${PRO_PLAN_ID}&billingInterval=${billingInterval}`;
}
