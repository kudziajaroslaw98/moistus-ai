import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { StateCreator } from 'zustand';
import { AppState } from '../app-state';

export interface SubscriptionPlan {
	id: string;
	name: string;
	displayName: string;
	description: string;
	priceMonthly: number;
	priceYearly: number;
	dodoProductIdMonthly?: string;
	dodoProductIdYearly?: string;
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
	dodoSubscriptionId?: string;
	dodoCustomerId?: string;
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

export interface UsageData {
	mindMapsCount: number;
	aiSuggestionsCount: number;
	collaboratorsCount: number;
	storageUsedMB: number;
	billingPeriod: {
		start: string;
		end: string;
	};
}

export interface SubscriptionSlice {
	// State
	availablePlans: SubscriptionPlan[];
	currentSubscription: UserSubscription | null;
	isLoadingSubscription: boolean;
	subscriptionError: string | null;
	usageData: UsageData | null;
	isLoadingUsage: boolean;
	usageError: string | null;

	// Actions
	fetchAvailablePlans: () => Promise<void>;
	fetchUserSubscription: () => Promise<void>;
	fetchUsageData: () => Promise<void>;
	createCheckoutSession: (
		planId: string,
		billingInterval: 'monthly' | 'yearly'
	) => Promise<{
		checkoutUrl?: string;
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
	isTrialing: () => boolean;
	getTrialDaysRemaining: () => number | null;
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
	usageData: null,
	isLoadingUsage: false,
	usageError: null,

	// Actions
	fetchAvailablePlans: async () => {
		const supabase = getSharedSupabaseClient();

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
				dodoProductIdMonthly: plan.dodo_product_id,
				dodoProductIdYearly: plan.dodo_product_id,
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
		const supabase = getSharedSupabaseClient();
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
					dodoSubscriptionId: data.dodo_subscription_id,
					dodoCustomerId: data.dodo_customer_id,
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
								dodoProductIdMonthly: data.plan.dodo_product_id,
								dodoProductIdYearly: data.plan.dodo_product_id,
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

	fetchUsageData: async () => {
		set({ isLoadingUsage: true, usageError: null });

		try {
			const response = await fetch('/api/user/billing/usage');

			if (!response.ok) {
				throw new Error('Failed to fetch usage data');
			}

			const { data } = await response.json();

			set({
				usageData: data,
				isLoadingUsage: false,
			});
		} catch (error) {
			console.error('Error fetching usage data:', error);
			// Keep stale data on error, just log it
			set({
				usageError:
					error instanceof Error ? error.message : 'Failed to fetch usage',
				isLoadingUsage: false,
			});
		}
	},

	createCheckoutSession: async (
		planId: string,
		billingInterval: 'monthly' | 'yearly'
	) => {
		try {
			const response = await fetch('/api/checkout/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planId, billingInterval }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create checkout session');
			}

			return {
				checkoutUrl: data.checkoutUrl,
			};
		} catch (error) {
			console.error('Error creating checkout session:', error);
			return {
				error:
					error instanceof Error
						? error.message
						: 'Failed to create checkout session',
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
		const { currentSubscription, availablePlans, usageData } = get();

		// Get the plan (either current subscription or free plan)
		const plan =
			currentSubscription?.plan ||
			availablePlans.find((p) => p.name === 'free');
		if (!plan) return null;

		const limit = plan.limits[limitType];
		if (limit === -1) return null; // Unlimited

		// Map limit type to usage data field
		const usageMap: Record<keyof SubscriptionPlan['limits'], number> = {
			mindMaps: usageData?.mindMapsCount ?? 0,
			aiSuggestions: usageData?.aiSuggestionsCount ?? 0,
			nodesPerMap: 0, // Handled per-map in client state
		};

		const currentUsage = usageMap[limitType];
		return Math.max(0, limit - currentUsage);
	},

	isTrialing: () => {
		const { currentSubscription } = get();
		return currentSubscription?.status === 'trialing';
	},

	getTrialDaysRemaining: () => {
		const { currentSubscription } = get();
		if (!currentSubscription?.trialEnd) return null;

		const now = new Date();
		const trialEnd = new Date(currentSubscription.trialEnd);
		const diffTime = trialEnd.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return Math.max(0, diffDays);
	},
});
