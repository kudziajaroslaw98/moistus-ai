import { createClient } from '@/helpers/supabase/client';
import { StateCreator } from 'zustand';
import { AppState } from '../app-state';

export interface SubscriptionPlan {
	id: string;
	name: string;
	displayName: string;
	description: string;
	priceMonthly: number;
	priceYearly: number;
	stripePriceIdMonthly?: string;
	stripePriceIdYearly?: string;
	features: string[];
	limits: {
		mindMaps: number;
		nodesPerMap: number;
		aiSuggestions: number;
	};
	isActive: boolean;
}

export interface UserSubscription {
	id: string;
	userId: string;
	planId: string;
	stripeSubscriptionId?: string;
	stripeCustomerId?: string;
	status:
		| 'active'
		| 'trialing'
		| 'past_due'
		| 'canceled'
		| 'unpaid'
		| 'incomplete'
		| 'incomplete_expired';
	currentPeriodStart?: Date;
	currentPeriodEnd?: Date;
	cancelAtPeriodEnd: boolean;
	canceledAt?: Date;
	trialEnd?: Date;
	plan?: SubscriptionPlan;
}

export interface SubscriptionSlice {
	// State
	availablePlans: SubscriptionPlan[];
	currentSubscription: UserSubscription | null;
	isLoadingSubscription: boolean;
	subscriptionError: string | null;

	// Actions
	fetchAvailablePlans: () => Promise<void>;
	fetchUserSubscription: () => Promise<void>;
	createSubscription: (
		planId: string,
		priceId: string,
		paymentMethodId: string
	) => Promise<{
		subscriptionId?: string;
		clientSecret?: string;
		error?: string;
	}>;
	updateSubscription: (
		subscriptionId: string,
		updates: Partial<UserSubscription>
	) => Promise<void>;
	cancelSubscription: (subscriptionId: string) => Promise<void>;
	reactivateSubscription: (subscriptionId: string) => Promise<void>;

	// Computed getters
	hasActiveSubscription: () => boolean;
	isProUser: () => boolean;
	canAccessFeature: (feature: string) => boolean;
	getRemainingLimit: (
		limitType: keyof SubscriptionPlan['limits']
	) => number | null;
}

export const createSubscriptionSlice: StateCreator<
	AppState,
	[],
	[],
	SubscriptionSlice
> = (set, get) => ({
	// Initial state
	availablePlans: [],
	currentSubscription: null,
	isLoadingSubscription: false,
	subscriptionError: null,

	// Actions
	fetchAvailablePlans: async () => {
		const supabase = createClient();

		try {
			const { data, error } = await supabase
				.from('subscription_plans')
				.select('*')
				.eq('is_active', true)
				.order('price_monthly', { ascending: true });

			if (error) throw error;

			const plans = data.map((plan) => ({
				id: plan.id,
				name: plan.name,
				displayName: plan.display_name,
				description: plan.description,
				priceMonthly: plan.price_monthly,
				priceYearly: plan.price_yearly,
				stripePriceIdMonthly: plan.stripe_price_id_monthly,
				stripePriceIdYearly: plan.stripe_price_id_yearly,
				features: plan.features,
				limits: plan.limits,
				isActive: plan.is_active,
			}));

			set({ availablePlans: plans });
		} catch (error) {
			console.error('Error fetching plans:', error);
			set({ subscriptionError: 'Failed to fetch subscription plans' });
		}
	},

	fetchUserSubscription: async () => {
		const supabase = createClient();
		set({ isLoadingSubscription: true, subscriptionError: null });

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				set({ currentSubscription: null, isLoadingSubscription: false });
				return;
			}

			// Get user's active subscription with plan details
			const { data, error } = await supabase
				.from('user_subscriptions')
				.select(
					`
          *,
          plan:subscription_plans (*)
        `
				)
				.eq('user_id', user.id)
				.in('status', ['active', 'trialing'])
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			if (error && error.code !== 'PGRST116') {
				// PGRST116 = no rows returned
				throw error;
			}

			if (data) {
				const subscription: UserSubscription = {
					id: data.id,
					userId: data.user_id,
					planId: data.plan_id,
					stripeSubscriptionId: data.stripe_subscription_id,
					stripeCustomerId: data.stripe_customer_id,
					status: data.status,
					currentPeriodStart: data.current_period_start
						? new Date(data.current_period_start)
						: undefined,
					currentPeriodEnd: data.current_period_end
						? new Date(data.current_period_end)
						: undefined,
					cancelAtPeriodEnd: data.cancel_at_period_end,
					canceledAt: data.canceled_at ? new Date(data.canceled_at) : undefined,
					trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
					plan: data.plan
						? {
								id: data.plan.id,
								name: data.plan.name,
								displayName: data.plan.display_name,
								description: data.plan.description,
								priceMonthly: data.plan.price_monthly,
								priceYearly: data.plan.price_yearly,
								stripePriceIdMonthly: data.plan.stripe_price_id_monthly,
								stripePriceIdYearly: data.plan.stripe_price_id_yearly,
								features: data.plan.features,
								limits: data.plan.limits,
								isActive: data.plan.is_active,
							}
						: undefined,
				};

				set({
					currentSubscription: subscription,
					isLoadingSubscription: false,
				});
			} else {
				// No active subscription, user is on free tier
				set({ currentSubscription: null, isLoadingSubscription: false });
			}
		} catch (error) {
			console.error('Error fetching subscription:', error);
			set({
				subscriptionError: 'Failed to fetch subscription',
				isLoadingSubscription: false,
			});
		}
	},

	createSubscription: async (
		planId: string,
		priceId: string,
		paymentMethodId: string
	) => {
		try {
			const response = await fetch('/api/subscriptions/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planId, priceId, paymentMethodId }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create subscription');
			}

			// Refresh subscription data after creation
			await get().fetchUserSubscription();

			return {
				subscriptionId: data.subscriptionId,
				clientSecret: data.clientSecret,
			};
		} catch (error) {
			console.error('Error creating subscription:', error);
			return {
				error:
					error instanceof Error
						? error.message
						: 'Failed to create subscription',
			};
		}
	},

	updateSubscription: async (
		subscriptionId: string,
		updates: Partial<UserSubscription>
	) => {
		try {
			const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to update subscription');
			}

			// Refresh subscription data
			await get().fetchUserSubscription();
		} catch (error) {
			console.error('Error updating subscription:', error);
			set({ subscriptionError: 'Failed to update subscription' });
		}
	},

	cancelSubscription: async (subscriptionId: string) => {
		try {
			const response = await fetch(
				`/api/subscriptions/${subscriptionId}/cancel`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to cancel subscription');
			}

			// Refresh subscription data
			await get().fetchUserSubscription();
		} catch (error) {
			console.error('Error canceling subscription:', error);
			set({ subscriptionError: 'Failed to cancel subscription' });
		}
	},

	reactivateSubscription: async (subscriptionId: string) => {
		try {
			const response = await fetch(
				`/api/subscriptions/${subscriptionId}/reactivate`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to reactivate subscription');
			}

			// Refresh subscription data
			await get().fetchUserSubscription();
		} catch (error) {
			console.error('Error reactivating subscription:', error);
			set({ subscriptionError: 'Failed to reactivate subscription' });
		}
	},

	// Computed getters
	hasActiveSubscription: () => {
		const { currentSubscription } = get();
		return (
			!!currentSubscription &&
			['active', 'trialing'].includes(currentSubscription.status)
		);
	},

	isProUser: () => {
		const { currentSubscription } = get();
		return (
			!!currentSubscription &&
			currentSubscription.plan?.name === 'pro' &&
			['active', 'trialing'].includes(currentSubscription.status)
		);
	},

	canAccessFeature: (feature: string) => {
		const { currentSubscription, availablePlans } = get();

		// If no subscription, check free plan features
		if (!currentSubscription) {
			const freePlan = availablePlans.find((p) => p.name === 'free');
			return freePlan?.features.includes(feature) || false;
		}

		// Check current plan features
		return currentSubscription.plan?.features.includes(feature) || false;
	},

	getRemainingLimit: (limitType: keyof SubscriptionPlan['limits']) => {
		const { currentSubscription, availablePlans } = get();

		// Get the plan (either current subscription or free plan)
		const plan =
			currentSubscription?.plan ||
			availablePlans.find((p) => p.name === 'free');
		if (!plan) return null;

		const limit = plan.limits[limitType];
		if (limit === -1) return null; // Unlimited

		// TODO: Calculate actual usage from nodes/maps
		// For now, return the limit itself
		return limit;
	},
});
