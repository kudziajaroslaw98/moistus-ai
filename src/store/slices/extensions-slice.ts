import { BUILTIN_AI_ACTIONS } from '@/lib/extensions/builtin-ai-actions';
import { BUILTIN_COMMANDS } from '@/lib/extensions/builtin-commands';
import { STARTER_RECIPE_CONTRIBUTIONS } from '@/lib/extensions/recipe-contributions';
import type { ExtensionsSlice, RecipesPanelView } from '@/types/extensions';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

let recipesPanelInstance = 0;

/** Gives editor views an instance number, so opening the editor again resets the form. */
function withEditorInstance(view: RecipesPanelView): RecipesPanelView {
	if (view.mode !== 'edit' || view.instance !== undefined) return view;
	recipesPanelInstance += 1;
	return { ...view, instance: recipesPanelInstance };
}

export const createExtensionsSlice: StateCreator<
	AppState,
	[],
	[],
	ExtensionsSlice
> = (set, get) => ({
	contributions: [
		...BUILTIN_AI_ACTIONS,
		...BUILTIN_COMMANDS,
		...STARTER_RECIPE_CONTRIBUTIONS,
	],
	recipesPanelView: { mode: 'list' },

	openRecipesPanel: (view = { mode: 'list' }) => {
		set({ recipesPanelView: withEditorInstance(view) });
		get().setPopoverOpen({ recipes: true, plugins: false });
	},

	setRecipesPanelView: (view) => {
		set({ recipesPanelView: withEditorInstance(view) });
	},

	registerContribution: (contribution) => {
		set((state) => {
			const index = state.contributions.findIndex(
				(existing) => existing.id === contribution.id
			);
			if (index === -1) {
				return { contributions: [...state.contributions, contribution] };
			}
			const contributions = [...state.contributions];
			contributions[index] = contribution;
			return { contributions };
		});

		return () => {
			// Only remove the entry this call registered, not a later replacement.
			if (get().contributions.includes(contribution)) {
				get().unregisterContribution(contribution.id);
			}
		};
	},

	unregisterContribution: (id) => {
		set((state) => ({
			contributions: state.contributions.filter(
				(contribution) => contribution.id !== id
			),
		}));
	},
});
