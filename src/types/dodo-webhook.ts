/**
 * Dodo Payments webhook payload types.
 * Based on Dodo documentation for subscription and payment events.
 */

export interface DodoCustomer {
	customer_id: string;
	email: string;
	name: string;
}

export interface DodoSubscriptionData {
	payload_type: 'Subscription';
	subscription_id: string;
	customer: DodoCustomer;
	product_id: string;
	status: string;
	recurring_pre_tax_amount: number;
	payment_frequency_interval: 'Day' | 'Week' | 'Month' | 'Year';
	created_at: string;
	next_billing_date: string;
	cancelled_at?: string | null;
	currency: string;
	metadata?: Record<string, string>;
}

export interface DodoPaymentData {
	payload_type: 'Payment';
	payment_id: string;
	customer: DodoCustomer;
	product_id: string;
	amount: number;
	currency: string;
	status: string;
	created_at: string;
	subscription_id?: string;
	metadata?: Record<string, string>;
}

export interface DodoWebhookPayload {
	business_id: string;
	type: string;
	timestamp: string;
	data: DodoSubscriptionData | DodoPaymentData;
}

/**
 * Dodo subscription status values.
 * Maps to our internal status values.
 */
export const DODO_STATUS_MAP: Record<string, string> = {
	active: 'active',
	on_hold: 'past_due',
	cancelled: 'canceled',
	expired: 'canceled',
	paused: 'paused',
	pending: 'incomplete',
};

/**
 * Dodo webhook event types we handle.
 */
export type DodoWebhookEventType =
	| 'subscription.active'
	| 'subscription.updated'
	| 'subscription.renewed'
	| 'subscription.cancelled'
	| 'subscription.failed'
	| 'subscription.on_hold'
	| 'subscription.paused'
	| 'subscription.expired'
	| 'payment.succeeded'
	| 'payment.failed';
