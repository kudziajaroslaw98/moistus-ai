import type {
	RecipeIconKey,
	RecipeNodeType,
	RecipeScope,
} from '@/lib/extensions/recipe-schema';
import {
	CheckSquare,
	ChefHat,
	CircleHelp,
	Code,
	FileText,
	LayoutGrid,
	Lightbulb,
	ListChecks,
	MessageCircle,
	Sparkles,
	TriangleAlert,
	Type,
	type LucideIcon,
} from 'lucide-react';

/** Icons a recipe can pick, keyed by the value stored in its definition. */
export const RECIPE_ICONS: Record<RecipeIconKey, { icon: LucideIcon; label: string }> =
	{
		alert: { icon: TriangleAlert, label: 'Warning' },
		grid: { icon: LayoutGrid, label: 'Grid' },
		help: { icon: CircleHelp, label: 'Question' },
		sparkles: { icon: Sparkles, label: 'Sparkles' },
		lightbulb: { icon: Lightbulb, label: 'Lightbulb' },
		'list-checks': { icon: ListChecks, label: 'Checklist' },
		'file-text': { icon: FileText, label: 'Document' },
		'chef-hat': { icon: ChefHat, label: 'Chef hat' },
	};

/**
 * Labels and icons for the node types a recipe can create. Same as NODE_REGISTRY,
 * kept here so recipe UI doesn't import every node component.
 */
export const RECIPE_NODE_TYPE_INFO: Record<
	RecipeNodeType,
	{ label: string; icon: LucideIcon }
> = {
	defaultNode: { label: 'Note', icon: FileText },
	taskNode: { label: 'Task', icon: CheckSquare },
	textNode: { label: 'Text', icon: Type },
	questionNode: { label: 'Question', icon: MessageCircle },
	annotationNode: { label: 'Annotation', icon: Lightbulb },
	codeNode: { label: 'Code Snippet', icon: Code },
};

/** Display order for node type choices (most used first). */
export const RECIPE_NODE_TYPE_ORDER = Object.keys(
	RECIPE_NODE_TYPE_INFO
) as RecipeNodeType[];

export const RECIPE_SCOPE_INFO: Record<
	RecipeScope,
	{ label: string; short: string; hint: string }
> = {
	node: {
		label: 'This idea',
		short: 'One idea',
		hint: 'The selected node with its parent, siblings and children.',
	},
	branch: {
		label: 'This branch',
		short: 'Branch',
		hint: 'The selected node and everything under it (up to 50 nodes).',
	},
	map: {
		label: 'Whole map',
		short: 'Whole map',
		hint: 'Every node on the map. Results attach where they fit best.',
	},
};

/** One-line summary for lists, e.g. "One idea · up to 4 · Note, Task". */
export function describeRecipe(definition: {
	scope: RecipeScope;
	output: { maxItems: number; nodeTypes: readonly RecipeNodeType[] };
}): string {
	const types = definition.output.nodeTypes
		.map((type) => RECIPE_NODE_TYPE_INFO[type].label)
		.join(', ');
	return `${RECIPE_SCOPE_INFO[definition.scope].short} · up to ${definition.output.maxItems} · ${types}`;
}
