import type { Contribution } from '@/types/extensions';
import { History, Search, Settings } from 'lucide-react';

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
];
