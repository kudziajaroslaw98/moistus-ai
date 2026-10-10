/**
 * Plan limits Shiko enforces. `-1` means unlimited. The `subscription_plans.limits`
 * column holds the same numbers for paid plans; these constants are the fallback when
 * no plan row loads and the single copy for the Free plan, so a stale database value
 * can't hand Free users AI actions. Free never gets AI actions; Pro is capped per
 * billing period. The SQL triggers (`enforce_map_node_limit`, `enforce_map_limit`)
 * mirror the map and node numbers: change them together.
 */
export interface PlanLimits {
	mindMaps: number;
	nodesPerMap: number;
	aiSuggestions: number;
	collaboratorsPerMap: number;
}

export const FREE_PLAN_LIMITS: PlanLimits = {
	mindMaps: 3,
	nodesPerMap: 50,
	aiSuggestions: 0,
	collaboratorsPerMap: 3,
};

export const PRO_PLAN_LIMITS: PlanLimits = {
	mindMaps: -1,
	nodesPerMap: -1,
	aiSuggestions: 100,
	collaboratorsPerMap: -1,
};

/**
 * Limits for a plan row: Free (or no plan) always uses the constants above; other plans
 * use their stored limits, with missing fields filled from the Pro defaults.
 */
export function resolvePlanLimits(
	plan:
		| { name?: string | null; limits?: Partial<PlanLimits> | null }
		| null
		| undefined
): PlanLimits {
	if (!plan || !plan.name || plan.name === 'free') return FREE_PLAN_LIMITS;
	return { ...PRO_PLAN_LIMITS, ...(plan.limits ?? {}) };
}
