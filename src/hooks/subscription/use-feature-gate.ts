'use client';

import { isProSubscription } from '@/helpers/subscription/subscription-hydration';
import useAppStore from '@/store/mind-map-store';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

export type FeatureKey =
	| 'unlimited-maps'
	| 'unlimited-nodes'
	| 'ai-suggestions'
	| 'realtime-collaboration'
	| 'advanced-export'
	| 'priority-support';

interface FeatureGateResult {
	hasAccess: boolean;
	isLoading: boolean;
	requiresPlan: 'pro' | null;
	currentPlan: string | null;
	showUpgradePrompt: () => void;
}

const FEATURE_PLAN_MAP: Record<FeatureKey, 'pro'> = {
	'unlimited-maps': 'pro',
	'unlimited-nodes': 'pro',
	'ai-suggestions': 'pro',
	'realtime-collaboration': 'pro',
	'advanced-export': 'pro',
	'priority-support': 'pro',
};

export function useFeatureGate(feature: FeatureKey): FeatureGateResult {
	const {
		currentSubscription,
		hasResolvedSubscription,
		isLoadingSubscription,
	} = useAppStore(
		useShallow((state) => ({
			currentSubscription: state.currentSubscription,
			hasResolvedSubscription: state.hasResolvedSubscription,
			isLoadingSubscription: state.isLoadingSubscription,
		}))
	);
	const isResolvingSubscription = !hasResolvedSubscription;

	const currentPlan = useMemo(() => {
		if (isResolvingSubscription) return null;
		if (!currentSubscription) return 'free';
		return currentSubscription.plan?.name || 'free';
	}, [currentSubscription, isResolvingSubscription]);

	const hasAccess = useMemo(() => {
		if (isResolvingSubscription) return false;

		// Check if current plan includes this feature
		const requiredPlan = FEATURE_PLAN_MAP[feature];

		if (!requiredPlan) return true; // Feature not gated

		if (requiredPlan === 'pro') {
			return isProSubscription(currentSubscription);
		}

		return false;
	}, [currentSubscription, feature, isResolvingSubscription]);

	const requiresPlan = useMemo(() => {
		if (isResolvingSubscription) return null;
		if (hasAccess) return null;
		return FEATURE_PLAN_MAP[feature] || null;
	}, [feature, hasAccess, isResolvingSubscription]);

	const showUpgradePrompt = useCallback(() => {
		useAppStore.getState().setPopoverOpen({ upgradeUser: true });
	}, []);

	return {
		hasAccess,
		isLoading: isResolvingSubscription || isLoadingSubscription,
		requiresPlan,
		currentPlan,
		showUpgradePrompt,
	};
}

// Usage limits hook
export function useSubscriptionLimits() {
	const {
		currentSubscription,
		hasResolvedSubscription,
		availablePlans,
		nodes,
		usageData,
		isLoadingUsage,
		usageError,
	} = useAppStore(
		useShallow((state) => ({
			currentSubscription: state.currentSubscription,
			hasResolvedSubscription: state.hasResolvedSubscription,
			availablePlans: state.availablePlans,
			nodes: state.nodes,
			usageData: state.usageData,
			isLoadingUsage: state.isLoadingUsage,
			usageError: state.usageError,
		}))
	);
	const isResolvingSubscription = !hasResolvedSubscription;
	const UNKNOWN_LIMITS = {
		mindMaps: -1,
		nodesPerMap: -1,
		aiSuggestions: -1,
		collaboratorsPerMap: -1,
	} as const;

	const limits = useMemo(() => {
		if (currentSubscription?.plan) {
			return {
				...currentSubscription.plan.limits,
				collaboratorsPerMap:
					currentSubscription.plan.limits.collaboratorsPerMap ??
					(currentSubscription.plan.name === 'free' ? 3 : -1),
			};
		}

		if (isResolvingSubscription) {
			return UNKNOWN_LIMITS;
		}

		const plan = availablePlans.find((p) => p.name === 'free');

		// Canonical free tier limits (override any stale DB values)
		const FREE_TIER_LIMITS = {
			mindMaps: 3,
			nodesPerMap: 50,
			aiSuggestions: 0,
			collaboratorsPerMap: 3,
		};

		if (!plan) {
			return FREE_TIER_LIMITS;
		}

		// For free tier, always use canonical limits to prevent stale DB values
		if (plan.name === 'free') {
			return FREE_TIER_LIMITS;
		}

		return {
			...plan.limits,
			// If field is missing, infer from plan: free=3, pro/enterprise=unlimited
			collaboratorsPerMap:
				plan.limits.collaboratorsPerMap ?? (plan.name === 'free' ? 3 : -1),
		};
	}, [availablePlans, currentSubscription, isResolvingSubscription]);

	const usage = useMemo(() => {
		return {
			mindMaps: usageData?.mindMapsCount ?? 0,
			nodesPerMap: nodes.length, // Client-side per current map
			aiSuggestions: usageData?.aiSuggestionsCount ?? 0,
			// Global collaborators count across all maps - accurate per-map count requires server query
			// Using 0 as placeholder since we can't compute per-map remaining from global count
			collaboratorsPerMap: 0,
		};
	}, [usageData, nodes.length]);

	const remaining = useMemo(() => {
		return {
			mindMaps:
				limits.mindMaps === -1
					? null
					: Math.max(0, limits.mindMaps - usage.mindMaps),
			nodesPerMap:
				limits.nodesPerMap === -1
					? null
					: Math.max(0, limits.nodesPerMap - usage.nodesPerMap),
			aiSuggestions:
				limits.aiSuggestions === -1
					? null
					: Math.max(0, limits.aiSuggestions - usage.aiSuggestions),
			// Per-map collaborator remaining requires server query - undefined since we can't compute client-side
			collaboratorsPerMap: undefined,
		};
	}, [limits, usage]);

	const isAtLimit = useCallback(
		(limitType: keyof typeof limits) => {
			if (isResolvingSubscription) return false;
			if (limits[limitType] === -1) return false; // Unlimited
			return usage[limitType] >= limits[limitType];
		},
		[isResolvingSubscription, limits, usage]
	);

	return {
		limits,
		usage,
		remaining,
		isAtLimit,
		hasResolvedSubscription,
		isLoadingUsage,
		usageError,
	};
}

/**
 * Hook to refetch usage data when window regains focus.
 * Uses getState() to avoid stale closures - fire and forget pattern.
 */
export function useUsageRefresh() {
	useEffect(() => {
		const handleFocus = () => {
			useAppStore.getState().fetchUsageData();
		};
		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, []);
}
