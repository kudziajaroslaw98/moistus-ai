'use client';

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
	const { currentSubscription, isLoadingSubscription } = useAppStore(
		useShallow((state) => ({
			currentSubscription: state.currentSubscription,
			isLoadingSubscription: state.isLoadingSubscription,
		}))
	);

	const currentPlan = useMemo(() => {
		if (!currentSubscription) return 'free';
		return currentSubscription.plan?.name || 'free';
	}, [currentSubscription]);

	const hasAccess = useMemo(() => {
		// While loading, deny access to prevent free users from accessing Pro features
		// This is more secure than optimistic access - UI should show loading state
		if (isLoadingSubscription) return false;

		// Check if current plan includes this feature
		const requiredPlan = FEATURE_PLAN_MAP[feature];

		if (!requiredPlan) return true; // Feature not gated

		if (currentPlan === 'pro' && requiredPlan === 'pro') return true;

		return false;
	}, [feature, currentPlan, isLoadingSubscription]);

	const requiresPlan = useMemo(() => {
		if (hasAccess) return null;
		return FEATURE_PLAN_MAP[feature] || null;
	}, [feature, hasAccess]);

	const showUpgradePrompt = useCallback(() => {
		useAppStore.getState().setPopoverOpen({ upgradeUser: true });
	}, []);

	return {
		hasAccess,
		isLoading: isLoadingSubscription,
		requiresPlan,
		currentPlan,
		showUpgradePrompt,
	};
}

// Usage limits hook
export function useSubscriptionLimits() {
	const {
		currentSubscription,
		availablePlans,
		nodes,
		usageData,
		isLoadingUsage,
		usageError,
	} = useAppStore(
		useShallow((state) => ({
			currentSubscription: state.currentSubscription,
			availablePlans: state.availablePlans,
			nodes: state.nodes,
			usageData: state.usageData,
			isLoadingUsage: state.isLoadingUsage,
			usageError: state.usageError,
		}))
	);

	const limits = useMemo(() => {
		const plan =
			currentSubscription?.plan ||
			availablePlans.find((p) => p.name === 'free');

		if (!plan) {
			return {
				mindMaps: 3,
				nodesPerMap: 50,
				aiSuggestions: 0,
				collaboratorsPerMap: 3,
			};
		}

		return {
			...plan.limits,
			// Ensure collaboratorsPerMap has a fallback
			collaboratorsPerMap: plan.limits.collaboratorsPerMap ?? 3,
		};
	}, [currentSubscription, availablePlans]);

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
			if (limits[limitType] === -1) return false; // Unlimited
			return usage[limitType] >= limits[limitType];
		},
		[limits, usage]
	);

	return {
		limits,
		usage,
		remaining,
		isAtLimit,
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
