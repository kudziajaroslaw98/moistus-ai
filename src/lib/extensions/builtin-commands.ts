import { availableCatalogUpdate } from '@/lib/plugins/catalog';
import type { Contribution, ContributionContext } from '@/types/extensions';
import { ChefHat, Code2, History, Plus, Puzzle, Search, Settings } from 'lucide-react';

/** Anything that lives on the account (drafts, saved recipes) is for signed-in accounts, not guests. */
const hasAccount = (ctx: ContributionContext) =>
	ctx.isMapReady && ctx.getState().currentUser?.is_anonymous === false;

/** Where "Write a plugin" starts: the Write a plugin tab, with its templates at the top. */
export const WRITE_PLUGIN_URL = '/dashboard/plugins/build';

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
		id: 'open-plugins',
		title: 'Plugins',
		description: (ctx) => {
			const { mindMap, currentUser, mapPlugins } = ctx.getState();
			if (!mindMap || !currentUser || mindMap.user_id !== currentUser.id)
				return 'See the plugins this map uses';
			const updates = mapPlugins.filter((record) =>
				availableCatalogUpdate(record.pluginId, record.version)
			).length;
			return updates > 0
				? `Turn plugins on or off · ${updates === 1 ? '1 update' : `${updates} updates`} available`
				: 'Turn plugins on or off for this map';
		},
		icon: Puzzle,
		keywords: ['plugin', 'extension', 'node types', 'metric', 'install'],
		owner: 'builtin',
		scopes: ['map'],
		placements: ['commandPalette'],
		when: (ctx) => ctx.isMapReady,
		run: (ctx) => ctx.getState().openPluginsPanel(),
	},
	{
		id: 'write-plugin',
		title: 'Write a plugin',
		description: 'Open the plugin editor with a template',
		icon: Code2,
		keywords: ['plugin', 'build', 'develop', 'playground', 'write', 'code'],
		owner: 'builtin',
		scopes: ['map'],
		placements: ['commandPalette'],
		when: hasAccount,
		// A new tab: the map stays open as it is.
		run: () => {
			window.open(WRITE_PLUGIN_URL, '_blank', 'noopener');
		},
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
		when: hasAccount,
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
		when: hasAccount,
		run: (ctx) => ctx.getState().openRecipesPanel(),
	},
];
