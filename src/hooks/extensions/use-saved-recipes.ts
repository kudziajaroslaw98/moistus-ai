'use client';

import type { SavedRecipe } from '@/lib/extensions/recipe-schema';
import useAppStore from '@/store/mind-map-store';
import useSWR from 'swr';

export const SAVED_RECIPES_KEY = '/api/recipes';

async function fetchSavedRecipes(url: string): Promise<SavedRecipe[]> {
	const response = await fetch(url);
	const body = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(body?.error ?? 'Failed to load recipes');
	}
	return body?.data ?? [];
}

/**
 * The signed-in user's saved recipes. Guests (anonymous sessions) can't save recipes,
 * so nothing is fetched for them.
 */
export function useSavedRecipes() {
	const canSaveRecipes = useAppStore((state) =>
		Boolean(state.currentUser && !state.currentUser.is_anonymous)
	);
	const { data, error, isLoading, mutate } = useSWR(
		canSaveRecipes ? SAVED_RECIPES_KEY : null,
		fetchSavedRecipes,
		{ revalidateOnFocus: false }
	);

	return {
		recipes: data ?? [],
		error: error as Error | undefined,
		isLoading,
		mutate,
		canSaveRecipes,
	};
}
