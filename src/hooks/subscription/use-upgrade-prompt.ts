'use client';

import {
	getFreeTierLimits,
	UPGRADE_PROMPT_CONFIG,
} from '@/constants/pricing-tiers';
import useAppStore from '@/store/mind-map-store';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSessionTime } from './use-session-time';

const COOLDOWN_KEY = 'upgrade_modal_dismissed_at';
const FREE_TIER_LIMITS = getFreeTierLimits();

/**
 * Consolidates all upgrade prompt trigger logic:
 * - Time-based: session threshold from UPGRADE_PROMPT_CONFIG
 * - Limit-based: maps/nodes from pricing-tiers.ts
 * - Cooldown after dismissal from UPGRADE_PROMPT_CONFIG
 * - Only for registered free users (not anonymous, not pro)
 */
export function useUpgradePrompt() {
	const { currentUser, currentSubscription, nodes, setPopoverOpen } =
		useAppStore(
			useShallow((state) => ({
				currentUser: state.currentUser,
				currentSubscription: state.currentSubscription,
				nodes: state.nodes,
				setPopoverOpen: state.setPopoverOpen,
			}))
		);
	const { getSessionMinutes } = useSessionTime();

	// Check if user is a registered free user (not anonymous, not pro/trialing)
	const isRegisteredFreeUser = useMemo(() => {
		if (!currentUser) return false;

		// Anonymous users have is_anonymous or no email
		const isAnonymous =
			currentUser.app_metadata?.is_anonymous || !currentUser.email;
		if (isAnonymous) return false;

		// Pro/trialing users shouldn't see upgrade prompts
		if (
			currentSubscription?.status === 'active' ||
			currentSubscription?.status === 'trialing'
		) {
			return false;
		}

		return true;
	}, [currentUser, currentSubscription]);

	// Check if modal is in cooldown period (dismissed within last 24h)
	const isInCooldown = useCallback(() => {
		if (typeof window === 'undefined') return true; // SSR safety

		const dismissed = localStorage.getItem(COOLDOWN_KEY);
		if (!dismissed) return false;

		const dismissedTime = parseInt(dismissed, 10);
		if (isNaN(dismissedTime)) return false;

		const hoursSince = (Date.now() - dismissedTime) / 1000 / 60 / 60;
		return hoursSince < UPGRADE_PROMPT_CONFIG.cooldownHours;
	}, []);

	// Check if time-based trigger should fire
	const shouldShowTimePrompt = useCallback(() => {
		if (!isRegisteredFreeUser) return false;
		if (isInCooldown()) return false;

		return getSessionMinutes() >= UPGRADE_PROMPT_CONFIG.sessionThresholdMinutes;
	}, [isRegisteredFreeUser, isInCooldown, getSessionMinutes]);

	// Check if limit-based trigger should fire
	const shouldShowLimitPrompt = useCallback(
		(mapCount: number) => {
			if (!isRegisteredFreeUser) return false;
			if (isInCooldown()) return false;

			// Check map limit
			if (mapCount >= FREE_TIER_LIMITS.mindMaps) return true;

			// Check node limit per map
			if (nodes.length >= FREE_TIER_LIMITS.nodesPerMap) return true;

			return false;
		},
		[isRegisteredFreeUser, isInCooldown, nodes.length]
	);

	// Open the upgrade modal
	const showUpgradeModal = useCallback(() => {
		setPopoverOpen({ upgradeUser: true });
	}, [setPopoverOpen]);

	// Dismiss and set cooldown
	const dismissWithCooldown = useCallback(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
		}
		setPopoverOpen({ upgradeUser: false });
	}, [setPopoverOpen]);

	// Clear cooldown (e.g., after successful upgrade)
	const clearCooldown = useCallback(() => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(COOLDOWN_KEY);
		}
	}, []);

	return {
		isRegisteredFreeUser,
		isInCooldown,
		shouldShowTimePrompt,
		shouldShowLimitPrompt,
		showUpgradeModal,
		dismissWithCooldown,
		clearCooldown,
	};
}
