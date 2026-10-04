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

export interface PaletteEntry {
	contribution: Contribution;
	ctx: ContributionContext;
}

/**
 * Command palette entries: each contribution appears once, acting on the selected node
 * when exactly one node is selected and it supports node scope, otherwise on the map.
 */
export function selectPaletteEntries(
	contributions: readonly Contribution[],
	createContext: (
		scope: ContributionContext['scope'],
		nodeId: string | null
	) => ContributionContext,
	selectedNodeId: string | null
): PaletteEntry[] {
	const nodeCtx = selectedNodeId ? createContext('node', selectedNodeId) : null;
	const mapCtx = createContext('map', null);
	const entries: PaletteEntry[] = [];

	for (const contribution of contributions) {
		if (
			nodeCtx &&
			selectContributions([contribution], 'commandPalette', nodeCtx).length
		) {
			entries.push({ contribution, ctx: nodeCtx });
		} else if (
			selectContributions([contribution], 'commandPalette', mapCtx).length
		) {
			entries.push({ contribution, ctx: mapCtx });
		}
	}
	return entries;
}

/** Case-insensitive match on title, description and keywords; every word must match. */
export function matchesPaletteQuery(
	entry: PaletteEntry,
	query: string
): boolean {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;

	const haystack = [
		entry.contribution.title,
		resolveContributionDescription(entry.contribution, entry.ctx) ?? '',
		...(entry.contribution.keywords ?? []),
	]
		.join(' ')
		.toLowerCase();
	return words.every((word) => haystack.includes(word));
}
