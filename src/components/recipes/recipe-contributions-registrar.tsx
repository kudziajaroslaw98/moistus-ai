'use client';

import { useSavedRecipes } from '@/hooks/extensions/use-saved-recipes';
import { recipeToContribution } from '@/lib/extensions/recipe-contributions';
import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';

/** Puts the user's saved recipes into the AI popover, context menu and palette. */
export function RecipeContributionsRegistrar() {
	const { recipes } = useSavedRecipes();
	const registerContribution = useAppStore((state) => state.registerContribution);

	useEffect(() => {
		const unregisters = recipes.map((recipe) =>
			registerContribution(recipeToContribution(recipe, 'user'))
		);
		return () => unregisters.forEach((unregister) => unregister());
	}, [recipes, registerContribution]);

	return null;
}
