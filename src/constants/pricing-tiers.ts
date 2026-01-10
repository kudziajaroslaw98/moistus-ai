/**
 * Shared pricing tier definitions
 * Used as fallback when database is unavailable and for UI consistency
 */

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
	limits: {
		mindMaps: number; // -1 = unlimited
		nodesPerMap: number; // -1 = unlimited
		aiSuggestions: number; // -1 = unlimited, per week
	};
}

export const PRICING_TIERS: PricingTier[] = [
	{
		id: 'free',
		name: 'Free',
		description: 'Perfect for personal use',
		monthlyPrice: 0,
		yearlyPrice: 0,
		features: [
			'3 mind maps',
			'50 nodes per map',
			'10 AI suggestions per week',
			'Basic export',
			'Community support',
		],
		limitations: ['No real-time collaboration'],
		ctaText: 'Start Free',
		limits: {
			mindMaps: 3,
			nodesPerMap: 50,
			aiSuggestions: 10,
		},
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
			'100 AI suggestions per week',
			'Real-time collaboration',
			'Priority support',
			'Advanced export options',
		],
		recommended: true,
		ctaText: 'Start Pro Trial',
		limits: {
			mindMaps: -1,
			nodesPerMap: -1,
			aiSuggestions: 100,
		},
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
	const freeTier = getPricingTier('free');
	return freeTier?.limits ?? { mindMaps: 3, nodesPerMap: 50, aiSuggestions: 10 };
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
