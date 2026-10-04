import type { RecipeIconKey } from '@/lib/extensions/recipe-schema';
import {
	ChefHat,
	CircleHelp,
	FileText,
	LayoutGrid,
	Lightbulb,
	ListChecks,
	Sparkles,
	TriangleAlert,
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
