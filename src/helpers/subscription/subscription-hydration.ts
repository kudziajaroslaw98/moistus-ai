import type {
	SubscriptionPlan,
	UserSubscription,
} from '@/store/slices/subscription-slice';

export interface SubscriptionPlanRecord {
	id: string;
	name: string;
	display_name: string;
	description: string;
	price_monthly: number;
	price_yearly: number;
	features: string[];
	limits: SubscriptionPlan['limits'];
	is_active: boolean;
}

export interface UserSubscriptionRecord {
	id: string;
	user_id: string;
	plan_id: string;
	status: UserSubscription['status'];
	current_period_start?: string | null;
	current_period_end?: string | null;
	cancel_at_period_end: boolean;
	canceled_at?: string | null;
	trial_end?: string | null;
	plan?: SubscriptionPlanRecord | null;
}

export interface SerializedSubscriptionPlan {
	id: string;
	name: string;
	displayName: string;
	description: string;
	priceMonthly: number;
	priceYearly: number;
	features: string[];
	limits: SubscriptionPlan['limits'];
	isActive: boolean;
}

export interface SerializedUserSubscription {
	id: string;
	userId: string;
	planId: string;
	status: UserSubscription['status'];
	currentPeriodStart?: string;
	currentPeriodEnd?: string;
	cancelAtPeriodEnd: boolean;
	canceledAt?: string;
	trialEnd?: string;
	plan?: SerializedSubscriptionPlan;
}

export interface SubscriptionHydrationState {
	currentSubscription: SerializedUserSubscription | null;
	hasResolvedSubscription: boolean;
}

export const EMPTY_SUBSCRIPTION_HYDRATION_STATE: SubscriptionHydrationState = {
	currentSubscription: null,
	hasResolvedSubscription: false,
};

type SubscriptionLike = {
	status?: string | null;
	plan?: { name?: string | null } | null;
};

const toDate = (value?: string) => (value ? new Date(value) : undefined);

export function serializeSubscriptionPlan(
	plan: SubscriptionPlanRecord
): SerializedSubscriptionPlan {
	return {
		id: plan.id,
		name: plan.name,
		displayName: plan.display_name,
		description: plan.description,
		priceMonthly: plan.price_monthly,
		priceYearly: plan.price_yearly,
		features: plan.features,
		limits: plan.limits,
		isActive: plan.is_active,
	};
}

export function serializeUserSubscription(
	subscription: UserSubscriptionRecord
): SerializedUserSubscription {
	return {
		id: subscription.id,
		userId: subscription.user_id,
		planId: subscription.plan_id,
		status: subscription.status,
		currentPeriodStart: subscription.current_period_start ?? undefined,
		currentPeriodEnd: subscription.current_period_end ?? undefined,
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
		canceledAt: subscription.canceled_at ?? undefined,
		trialEnd: subscription.trial_end ?? undefined,
		plan: subscription.plan
			? serializeSubscriptionPlan(subscription.plan)
			: undefined,
	};
}

export function deserializeUserSubscription(
	subscription: SerializedUserSubscription | null
): UserSubscription | null {
	if (!subscription) {
		return null;
	}

	return {
		id: subscription.id,
		userId: subscription.userId,
		planId: subscription.planId,
		status: subscription.status,
		currentPeriodStart: toDate(subscription.currentPeriodStart),
		currentPeriodEnd: toDate(subscription.currentPeriodEnd),
		cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
		canceledAt: toDate(subscription.canceledAt),
		trialEnd: toDate(subscription.trialEnd),
		plan: subscription.plan
			? {
					id: subscription.plan.id,
					name: subscription.plan.name,
					displayName: subscription.plan.displayName,
					description: subscription.plan.description,
					priceMonthly: subscription.plan.priceMonthly,
					priceYearly: subscription.plan.priceYearly,
					features: subscription.plan.features,
					limits: subscription.plan.limits,
					isActive: subscription.plan.isActive,
				}
			: undefined,
	};
}

export function isActiveSubscription(
	subscription: SubscriptionLike | null | undefined
) {
	return (
		!!subscription &&
		(subscription.status === 'active' || subscription.status === 'trialing')
	);
}

export function isProSubscription(
	subscription: SubscriptionLike | null | undefined
) {
	return (
		subscription?.plan?.name === 'pro' && isActiveSubscription(subscription)
	);
}
