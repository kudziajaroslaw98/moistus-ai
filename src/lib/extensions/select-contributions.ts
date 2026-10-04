import type {
	Contribution,
	ContributionContext,
	ContributionPlacement,
} from '@/types/extensions';

/** Entries to show on a surface for the given context, in registration order. */
export function selectContributions(
	contributions: readonly Contribution[],
	placement: ContributionPlacement,
	ctx: ContributionContext
): Contribution[] {
	return contributions.filter((contribution) => {
		if (!contribution.placements.includes(placement)) return false;
		if (!contribution.scopes.includes(ctx.scope)) return false;
		if (ctx.scope === 'node' && !ctx.nodeId) return false;
		if (contribution.requiresEdit && !ctx.canEdit) return false;
		return contribution.when?.(ctx) ?? true;
	});
}

export function resolveContributionDescription(
	contribution: Contribution,
	ctx: ContributionContext
): string | undefined {
	return typeof contribution.description === 'function'
		? contribution.description(ctx)
		: contribution.description;
}
