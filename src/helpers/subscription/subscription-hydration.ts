import type {
	SubscriptionPlan,
	UserSubscription,
} from '@/store/slices/subscription-slice';

export interface SerializedSubscriptionPlan {
	id: string;
	name: string;
	displayName: string;
	description: string;
	priceMonthly: number;
	priceYearly: number;
	dodoProductIdMonthly?: string;
	dodoProductIdYearly?: string;
	features: string[];
	limits: SubscriptionPlan['limits'];
	isActive: boolean;
}

export interface SerializedUserSubscription {
	id: string;
	userId: string;
	planId: string;
	dodoSubscriptionId?: string;
	dodoCustomerId?: string;
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

type SubscriptionLike = {
	status?: string | null;
	plan?: { name?: string | null } | null;
};

const toDate = (value?: string) => (value ? new Date(value) : undefined);

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
		dodoSubscriptionId: subscription.dodoSubscriptionId,
		dodoCustomerId: subscription.dodoCustomerId,
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
					dodoProductIdMonthly: subscription.plan.dodoProductIdMonthly,
					dodoProductIdYearly: subscription.plan.dodoProductIdYearly,
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
