import type { RecipeDefinition } from '@/lib/extensions/recipe-schema';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { AppState } from '@/store/app-state';
import type { LucideIcon } from 'lucide-react';
import type { EdgeData } from './edge-data';
import type { NodeData } from './node-data';

/** Who initiated a graph change. Recorded on history events for attribution and revert. */
export type GraphActor =
	| { kind: 'user'; id: string }
	/** `label` is the display name at the time of the change (survives uninstall/deletion). */
	| { kind: 'plugin'; id: string; label?: string }
	| { kind: 'recipe'; id: string; label?: string };

/**
 * Data owned by an extension node (`extensionNode`), stored at `metadata.extension`.
 * `snapshot` is the last declarative render, shown when the plugin is unavailable.
 */
export interface NodeExtensionData {
	pluginId: string;
	kind: string;
	version: string;
	data: Record<string, unknown>;
	snapshot?: unknown;
}

export type GraphOp =
	| {
			type: 'createNode';
			nodeType?: AvailableNodeTypes;
			content?: string;
			data?: Partial<NodeData>;
			position?: { x: number; y: number };
			parentNodeId?: string | null;
			nodeId?: string;
	  }
	| { type: 'updateNode'; nodeId: string; data: Partial<NodeData> }
	| { type: 'deleteNodes'; nodeIds: string[] }
	| {
			type: 'createEdge';
			source: string;
			target: string;
			data?: Partial<EdgeData>;
	  }
	| { type: 'updateEdge'; edgeId: string; data: Partial<EdgeData> }
	| { type: 'deleteEdges'; edgeIds: string[] };

export type GraphOpsResult =
	{ ok: true; applied: number } | { ok: false; applied: number; error: string };

/** Whether an entry acts on one node or on the whole map. */
export type ContributionScope = 'node' | 'map';

/** UI surfaces that list contributed entries. The right-click menu stays editing-only. */
export type ContributionPlacement = 'aiMenu' | 'commandPalette';

export interface ContributionContext {
	getState: () => AppState;
	scope: ContributionScope;
	/** Target node for node-scoped entries; null for map scope. */
	nodeId: string | null;
	canEdit: boolean;
	isMapReady: boolean;
}

/**
 * An entry contributed to menus and the command palette. Built-in AI actions use
 * this today; plugins and recipes will register their own.
 */
export interface Contribution {
	/** Unique id. Built-ins use plain ids; plugins should namespace theirs. */
	id: string;
	title: string;
	description?: string | ((ctx: ContributionContext) => string);
	icon: LucideIcon;
	/** Extra search terms for the command palette. */
	keywords?: string[];
	owner: 'builtin' | (string & {});
	/** Grouped entries render under their own heading ("Recipes") after ungrouped ones. */
	group?: 'recipes';
	scopes: ContributionScope[];
	placements: ContributionPlacement[];
	requiresEdit?: boolean;
	requiresAIQuota?: boolean;
	when?: (ctx: ContributionContext) => boolean;
	isBusy?: (ctx: ContributionContext) => boolean;
	run: (ctx: ContributionContext) => void | Promise<void>;
}

/** What the recipes side panel shows: the list, or the editor for one recipe. */
export type RecipesPanelView =
	| { mode: 'list' }
	| {
			mode: 'edit';
			/** Saved recipe being edited; null for a new (possibly duplicated) recipe. */
			recipeId: string | null;
			/** Starting values; null starts from the blank template. */
			initial: RecipeDefinition | null;
			/**
			 * Editor instance; a new one resets the form. Assigned by the store unless the
			 * caller passes the current one (e.g. after saving).
			 */
			instance?: number;
	  };

export interface ExtensionsSlice {
	contributions: Contribution[];
	recipesPanelView: RecipesPanelView;
	/** Opens the recipes panel on the list, or straight into the editor. */
	openRecipesPanel: (view?: RecipesPanelView) => void;
	setRecipesPanelView: (view: RecipesPanelView) => void;
	/** Adds (or replaces, by id) an entry. Returns a function that removes it. */
	registerContribution: (contribution: Contribution) => () => void;
	unregisterContribution: (id: string) => void;
}
