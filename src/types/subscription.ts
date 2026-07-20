export const PRO_PLAN_ID = 'pro' as const;

export type BillingInterval = 'monthly' | 'yearly';

export interface ProCheckoutIntent {
	planId: typeof PRO_PLAN_ID;
	billingInterval: BillingInterval;
}
