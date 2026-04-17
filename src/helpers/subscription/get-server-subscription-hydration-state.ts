import type {
	SerializedSubscriptionPlan,
	SerializedUserSubscription,
	SubscriptionHydrationState,
} from '@/helpers/subscription/subscription-hydration';
import { createClient } from '@/helpers/supabase/server';

function serializePlan(plan: {
	id: string;
	name: string;
	display_name: string;
	description: string;
	price_monthly: number;
	price_yearly: number;
	dodo_product_id?: string | null;
	features: string[];
	limits: SerializedSubscriptionPlan['limits'];
	is_active: boolean;
}): SerializedSubscriptionPlan {
	return {
		id: plan.id,
		name: plan.name,
		displayName: plan.display_name,
		description: plan.description,
		priceMonthly: plan.price_monthly,
		priceYearly: plan.price_yearly,
		dodoProductIdMonthly: plan.dodo_product_id ?? undefined,
		dodoProductIdYearly: plan.dodo_product_id ?? undefined,
		features: plan.features,
		limits: plan.limits,
		isActive: plan.is_active,
	};
}

function serializeSubscription(subscription: {
	id: string;
	user_id: string;
	plan_id: string;
	dodo_subscription_id?: string | null;
	dodo_customer_id?: string | null;
	status: SerializedUserSubscription['status'];
	current_period_start?: string | null;
	current_period_end?: string | null;
	cancel_at_period_end: boolean;
	canceled_at?: string | null;
	trial_end?: string | null;
	plan?: Parameters<typeof serializePlan>[0] | null;
}): SerializedUserSubscription {
	return {
		id: subscription.id,
		userId: subscription.user_id,
		planId: subscription.plan_id,
		dodoSubscriptionId: subscription.dodo_subscription_id ?? undefined,
		dodoCustomerId: subscription.dodo_customer_id ?? undefined,
		status: subscription.status,
		currentPeriodStart: subscription.current_period_start ?? undefined,
		currentPeriodEnd: subscription.current_period_end ?? undefined,
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
		canceledAt: subscription.canceled_at ?? undefined,
		trialEnd: subscription.trial_end ?? undefined,
		plan: subscription.plan ? serializePlan(subscription.plan) : undefined,
	};
}

export async function getServerSubscriptionHydrationState(
	userId: string
): Promise<SubscriptionHydrationState> {
	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from('user_subscriptions')
			.select(
				`
					*,
					plan:subscription_plans (*)
				`
			)
			.eq('user_id', userId)
			.in('status', ['active', 'trialing'])
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error(
				'[subscription-hydration] Failed to fetch server subscription snapshot:',
				error
			);

			return {
				currentSubscription: null,
				hasResolvedSubscription: false,
			};
		}

		return {
			currentSubscription: data ? serializeSubscription(data) : null,
			hasResolvedSubscription: true,
		};
	} catch (error) {
		console.error(
			'[subscription-hydration] Unexpected server subscription snapshot error:',
			error
		);

		return {
			currentSubscription: null,
			hasResolvedSubscription: false,
		};
	}
}
