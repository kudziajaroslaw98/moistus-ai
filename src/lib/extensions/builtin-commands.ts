import type { Contribution, ContributionContext } from '@/types/extensions';
import { ChefHat, History, Plus, Search, Settings } from 'lucide-react';

/** Recipes are saved per account, so guests (anonymous sessions) can't manage them. */
const canSaveRecipes = (ctx: ContributionContext) =>
	ctx.isMapReady && ctx.getState().currentUser?.is_anonymous === false;

/** Built-in non-AI commands available in the command palette. */
export const BUILTIN_COMMANDS: Contribution[] = [
	{
		id: 'search-canvas',
		title: 'Search canvas',
		description: 'Find nodes, including inside collapsed branches',
		icon: Search,
		keywords: ['find', 'filter'],
		owner: 'builtin',
		scopes: ['map'],
		placements: ['commandPalette'],
		when: (ctx) => ctx.isMapReady,
		run: (ctx) => ctx.getState().openCanvasSearch(),
	},
	{
		id: 'open-history',
		title: 'Open history',
		description: 'Browse and restore earlier versions of this map',
		icon: History,
		keywords: ['undo', 'revert', 'checkpoint', 'versions'],
		owner: 'builtin',
		scopes: ['map'],
		placements: ['commandPalette'],
		requiresEdit: true,
		when: (ctx) => ctx.isMapReady,
		run: (ctx) => ctx.getState().setPopoverOpen({ history: true }),
	},
	{
		id: 'open-map-settings',
		title: 'Map settings',
		description: 'Edit the map title, description and tags',
		icon: Settings,
		keywords: ['rename', 'title', 'tags'],
		owner: 'builtin',
		scopes: ['map'],
		placements: ['commandPalette'],
		when: (ctx) => {
			const { mindMap, currentUser } = ctx.getState();
			return (
				ctx.isMapReady &&
				Boolean(currentUser) &&
				mindMap?.user_id === currentUser?.id
			);
		},
		run: (ctx) => ctx.getState().setPopoverOpen({ mapSettings: true }),
	},
	{
		id: 'create-recipe',
		title: 'Create recipe',
		description: 'Save your own AI action',
		icon: Plus,
		keywords: ['recipe', 'ai', 'new'],
		owner: 'builtin',
		scopes: ['map'],
		placements: ['commandPalette'],
		when: canSaveRecipes,
		run: (ctx) =>
			ctx.getState().openRecipesPanel({ mode: 'edit', recipeId: null, initial: null }),
	},
	{
		id: 'manage-recipes',
		title: 'Manage recipes',
		description: 'Edit, share or delete your recipes',
		icon: ChefHat,
		keywords: ['recipe', 'ai', 'share'],
		owner: 'builtin',
		scopes: ['map'],
		placements: ['commandPalette'],
		when: canSaveRecipes,
		run: (ctx) => ctx.getState().openRecipesPanel(),
	},
];
