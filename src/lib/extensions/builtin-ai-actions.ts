import { COUNTERPOINTS_RECIPE } from '@/lib/extensions/starter-recipes';
import type { Contribution, ContributionContext } from '@/types/extensions';
import { Link2, Merge, NotepadTextDashed, Sparkles } from 'lucide-react';

const allPlacements: Contribution['placements'] = ['aiMenu', 'commandPalette'];

const isStreaming = (ctx: ContributionContext) => ctx.getState().isStreaming;
const isMapReady = (ctx: ContributionContext) => ctx.isMapReady;
const nodeIdForScope = (ctx: ContributionContext) =>
	ctx.scope === 'node' ? (ctx.nodeId ?? undefined) : undefined;

/**
 * Built-in AI actions, shown in the toolbar/node AI popover and the command palette
 * from this single list.
 */
export const BUILTIN_AI_ACTIONS: Contribution[] = [
	{
		id: 'expand-ideas',
		title: 'Expand ideas',
		description: 'Generate child nodes from this idea',
		icon: Sparkles,
		keywords: ['ai', 'suggest', 'children', 'brainstorm'],
		owner: 'builtin',
		scopes: ['node'],
		placements: allPlacements,
		requiresEdit: true,
		requiresAIQuota: true,
		when: isMapReady,
		isBusy: isStreaming,
		run: (ctx) => {
			if (!ctx.nodeId) return;
			return ctx.getState().generateSuggestions({
				sourceNodeId: ctx.nodeId,
				trigger: 'magic-wand',
			});
		},
	},
	{
		id: 'expand-map',
		title: 'Expand map',
		description: 'Generate suggestions across the whole map',
		icon: Sparkles,
		keywords: ['ai', 'suggest', 'brainstorm', 'whole map'],
		owner: 'builtin',
		scopes: ['map'],
		placements: allPlacements,
		requiresEdit: true,
		requiresAIQuota: true,
		when: isMapReady,
		isBusy: isStreaming,
		run: (ctx) => ctx.getState().generateSuggestions({ trigger: 'magic-wand' }),
	},
	{
		id: 'generate-counterpoints',
		title: 'Generate counterpoints',
		description: 'Challenge this idea with opposing views',
		icon: NotepadTextDashed,
		keywords: ['ai', 'risk', 'argue', 'challenge'],
		owner: 'builtin',
		scopes: ['node'],
		placements: allPlacements,
		requiresEdit: true,
		requiresAIQuota: true,
		when: isMapReady,
		isBusy: isStreaming,
		run: (ctx) => {
			if (!ctx.nodeId) return;
			ctx.getState().runRecipe(COUNTERPOINTS_RECIPE, ctx.nodeId);
		},
	},
	{
		id: 'find-connections',
		title: 'Find connections',
		description: (ctx) =>
			ctx.scope === 'node'
				? 'Find relationships for this node'
				: 'Discover connections across the map',
		icon: Link2,
		keywords: ['ai', 'link', 'relationships', 'edges'],
		owner: 'builtin',
		scopes: ['node', 'map'],
		placements: allPlacements,
		requiresEdit: true,
		requiresAIQuota: true,
		when: isMapReady,
		isBusy: isStreaming,
		run: (ctx) =>
			ctx.getState().generateConnectionSuggestions(nodeIdForScope(ctx)),
	},
	{
		id: 'find-similar',
		title: 'Find similar',
		description: (ctx) =>
			ctx.scope === 'node'
				? 'Find duplicates or overlapping nodes'
				: 'Find mergeable nodes across the map',
		icon: Merge,
		keywords: ['ai', 'merge', 'duplicates'],
		owner: 'builtin',
		scopes: ['node', 'map'],
		placements: allPlacements,
		requiresEdit: true,
		requiresAIQuota: true,
		when: isMapReady,
		isBusy: isStreaming,
		run: (ctx) => ctx.getState().generateMergeSuggestions(nodeIdForScope(ctx)),
	},
];
