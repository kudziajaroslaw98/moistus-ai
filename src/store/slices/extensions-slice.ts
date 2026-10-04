import { BUILTIN_AI_ACTIONS } from '@/lib/extensions/builtin-ai-actions';
import { BUILTIN_COMMANDS } from '@/lib/extensions/builtin-commands';
import { STARTER_RECIPE_CONTRIBUTIONS } from '@/lib/extensions/recipe-contributions';
import type { ExtensionsSlice } from '@/types/extensions';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

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
