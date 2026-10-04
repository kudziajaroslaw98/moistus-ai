'use client';

import type {
	RecipeDefinition,
	RecipeVisibility,
	SavedRecipe,
} from '@/lib/extensions/recipe-schema';
import useAppStore from '@/store/mind-map-store';
import { useCallback } from 'react';
import useSWR from 'swr';

export const SAVED_RECIPES_KEY = '/api/recipes';

/** A failed recipes API call, with the server's message and optional error code. */
export class RecipeRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string
	) {
		super(message);
		this.name = 'RecipeRequestError';
	}
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers },
	});
	const body = await response.json().catch(() => null);
	if (!response.ok) {
		throw new RecipeRequestError(
			body?.error ?? 'Something went wrong. Please try again.',
			response.status,
			body?.data?.code
		);
	}
	return body?.data as T;
}

const fetchSavedRecipes = (url: string) => requestJson<SavedRecipe[]>(url);

/**
 * The signed-in user's saved recipes plus the actions that change them. Guests
 * (anonymous sessions) can't save recipes, so nothing is fetched for them.
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

	const replaceRecipe = useCallback(
		(recipe: SavedRecipe) =>
			mutate(
				(current = []) => [
					recipe,
					...current.filter((existing) => existing.id !== recipe.id),
				],
				{ revalidate: false }
			),
		[mutate]
	);

	const createRecipe = useCallback(
		async (definition: RecipeDefinition) => {
			const recipe = await requestJson<SavedRecipe>(SAVED_RECIPES_KEY, {
				method: 'POST',
				body: JSON.stringify({ definition }),
			});
			await replaceRecipe(recipe);
			return recipe;
		},
		[replaceRecipe]
	);

	const updateRecipe = useCallback(
		async (
			id: string,
			patch: { definition?: RecipeDefinition; visibility?: RecipeVisibility }
		) => {
			const recipe = await requestJson<SavedRecipe>(`${SAVED_RECIPES_KEY}/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(patch),
			});
			await replaceRecipe(recipe);
			return recipe;
		},
		[replaceRecipe]
	);

	const deleteRecipe = useCallback(
		async (id: string) => {
			await requestJson(`${SAVED_RECIPES_KEY}/${id}`, { method: 'DELETE' });
			await mutate(
				(current = []) => current.filter((recipe) => recipe.id !== id),
				{ revalidate: false }
			);
		},
		[mutate]
	);

	return {
		recipes: data ?? [],
		error: error as Error | undefined,
		isLoading,
		canSaveRecipes,
		createRecipe,
		updateRecipe,
		deleteRecipe,
	};
}

/** Adds a shared recipe to the caller's recipes (their own copy). */
export function installSharedRecipe(id: string) {
	return requestJson<SavedRecipe>(`${SAVED_RECIPES_KEY}/${id}/install`, {
		method: 'POST',
	});
}
