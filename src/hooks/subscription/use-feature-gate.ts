'use client';

import useAppStore from '@/store/mind-map-store';
import { useCallback, useMemo } from 'react';
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
		// While loading, optimistically allow access to prevent UI flashing
		if (isLoadingSubscription) return true;

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
	const { currentSubscription, availablePlans, nodes } = useAppStore(
		useShallow((state) => ({
			currentSubscription: state.currentSubscription,
			availablePlans: state.availablePlans,
			nodes: state.nodes,
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
				aiSuggestions: 10,
			};
		}

		return plan.limits;
	}, [currentSubscription, availablePlans]);

	const usage = useMemo(() => {
		// TODO: Implement actual usage calculation
		// For now, return mock data
		return {
			mindMaps: 1, // Current map
			nodesPerMap: nodes.length,
			aiSuggestions: 0, // TODO: Track AI usage
		};
	}, [nodes]);

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
	};
}
