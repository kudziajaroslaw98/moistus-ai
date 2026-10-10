/**
 * Shared pricing tier definitions
 * Used as fallback when database is unavailable and for UI consistency
 */

import {
	FREE_PLAN_LIMITS,
	PRO_PLAN_LIMITS,
	type PlanLimits,
} from '@/constants/plan-limits';

export interface PricingTier {
	id: 'free' | 'pro';
	name: string;
	description: string;
	monthlyPrice: number;
	yearlyPrice: number;
	discount?: string;
	features: string[];
	limitations?: string[];
	recommended?: boolean;
	ctaText: string;
	/** -1 = unlimited; `aiSuggestions` is per billing period. */
	limits: PlanLimits;
}

export const PRICING_TIERS: PricingTier[] = [
	{
		id: 'free',
		name: 'Free',
		description: 'Perfect for personal use',
		monthlyPrice: 0,
		yearlyPrice: 0,
		features: [
			`${FREE_PLAN_LIMITS.mindMaps} mind maps`,
			`${FREE_PLAN_LIMITS.nodesPerMap} nodes per map`,
			`Up to ${FREE_PLAN_LIMITS.collaboratorsPerMap} collaborators per map`,
			'Basic export',
			'Community support',
		],
		limitations: ['No AI features'],
		ctaText: 'Get Started',
		limits: FREE_PLAN_LIMITS,
	},
	{
		id: 'pro',
		name: 'Pro',
		description: 'For professionals and teams',
		monthlyPrice: 12,
		yearlyPrice: 120,
		discount: '17% off',
		features: [
			'Unlimited mind maps',
			'Unlimited nodes',
			'Unlimited collaborators',
			`${PRO_PLAN_LIMITS.aiSuggestions} AI suggestions per month`,
			'Real-time collaboration',
			'Priority support',
			'Advanced export options',
		],
		recommended: true,
		ctaText: 'Go Pro',
		limits: PRO_PLAN_LIMITS,
	},
];

/**
 * Get pricing tier by ID
 */
export function getPricingTier(id: 'free' | 'pro'): PricingTier | undefined {
	return PRICING_TIERS.find((tier) => tier.id === id);
}

/**
 * Get price for a specific tier and billing cycle
 */
export function getPrice(
	tierId: 'free' | 'pro',
	billingCycle: 'monthly' | 'yearly'
): number {
	const tier = getPricingTier(tierId);
	if (!tier) return 0;

	return billingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
}

/**
 * Get limits for the free tier
 */
export function getFreeTierLimits() {
	return getPricingTier('free')?.limits ?? FREE_PLAN_LIMITS;
}

/**
 * Upgrade prompt configuration
 */
export const UPGRADE_PROMPT_CONFIG = {
	/** Hours before showing upgrade modal again after dismissal */
	cooldownHours: 24,
	/** Minutes of session time before showing time-based upgrade prompt */
	sessionThresholdMinutes: 30,
} as const;
