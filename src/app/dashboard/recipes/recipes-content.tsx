'use client';

import {
	CatalogCardSkeleton,
	CatalogGrid,
} from '@/components/dashboard/catalog-card';
import {
	DashboardPage,
	PageHeading,
	PRIMARY_BUTTON_CLASS,
} from '@/components/dashboard/dashboard-page';
import { RecipeConfirmDialog } from '@/components/recipes/recipe-confirm-dialog';
import { RecipeEditor } from '@/components/recipes/recipe-editor';
import { type RecipeDefinition } from '@/lib/extensions/recipe-schema';
import useAppStore from '@/store/mind-map-store';
import { ChevronLeft, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RecipesGrid } from './recipes-grid';

type PageView =
	| { mode: 'list' }
	| {
			mode: 'edit';
			recipeId: string | null;
			initial: RecipeDefinition | null;
			/** A new key resets the form; saving keeps it so the editor stays mounted. */
			key: number;
	  };

const RECIPES_INTRO =
	'AI actions you write once and run on any map. Every result is a suggestion you accept or reject.';

/** The page before it mounts (recipes/loading.tsx): same heading, empty tabs, card skeletons. */
export function RecipesPageSkeleton() {
	return (
		<DashboardPage>
			<PageHeading intro={RECIPES_INTRO} title='Recipes' />

			<div className='mt-9 h-11 border-b border-[#1d1f24]' />

			<div aria-busy data-testid='recipes-page-loading'>
				<CatalogGrid className='mt-6' viewMode='grid'>
					<CatalogCardSkeleton viewMode='grid' />
				</CatalogGrid>
			</div>
		</DashboardPage>
	);
}

/** Dashboard Recipes page: cards for your recipes and the starters, and the full-width editor. */
export function RecipesContent() {
	const hasUser = useAppStore((state) => Boolean(state.currentUser));
	const getCurrentUser = useAppStore((state) => state.getCurrentUser);
	const [view, setView] = useState<PageView>({ mode: 'list' });
	const [pendingLeave, setPendingLeave] = useState(false);
	const isEditorDirty = useRef(false);
	const nextKey = useRef(0);

	// Saved recipes load for the signed-in user in the store, which only map pages set.
	useEffect(() => {
		if (!hasUser) void getCurrentUser();
	}, [hasUser, getCurrentUser]);

	const handleDirtyChange = useCallback((isDirty: boolean) => {
		isEditorDirty.current = isDirty;
	}, []);

	const openEditor = (
		recipeId: string | null,
		initial: RecipeDefinition | null
	) => {
		isEditorDirty.current = false;
		nextKey.current += 1;
		setView({ mode: 'edit', recipeId, initial, key: nextKey.current });
	};

	const showList = () => {
		isEditorDirty.current = false;
		setPendingLeave(false);
		setView({ mode: 'list' });
	};

	const requestList = () => {
		if (view.mode === 'edit' && isEditorDirty.current) {
			setPendingLeave(true);
			return;
		}
		showList();
	};

	if (!hasUser) {
		// Until the user loads, the list would say "Create an account to save recipes".
		return <RecipesPageSkeleton />;
	}

	return (
		<>
			<DashboardPage>
				{view.mode === 'edit' ? (
					<>
						<button
							className='mb-3 inline-flex items-center gap-0.5 rounded-sm text-sm text-zinc-400 transition-colors duration-200 ease hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
							onClick={requestList}
							type='button'
						>
							<ChevronLeft aria-hidden className='size-4' />
							All recipes
						</button>

						<PageHeading
							intro={RECIPES_INTRO}
							title={view.recipeId ? 'Edit recipe' : 'New recipe'}
						/>

						<div className='mt-6'>
							<RecipeEditor
								initial={view.initial}
								key={view.key}
								layout='page'
								onClose={requestList}
								onDirtyChange={handleDirtyChange}
								recipeId={view.recipeId}
								onSaved={(recipe) =>
									setView({
										mode: 'edit',
										recipeId: recipe.id,
										initial: recipe.definition,
										key: view.key,
									})
								}
							/>
						</div>
					</>
				) : (
					<>
						<PageHeading
							intro={RECIPES_INTRO}
							title='Recipes'
							action={
								<button
									className={PRIMARY_BUTTON_CLASS}
									onClick={() => openEditor(null, null)}
									type='button'
								>
									<Plus aria-hidden className='size-4' />
									New recipe
								</button>
							}
						/>

						<RecipesGrid
							onCreate={(initial) => openEditor(null, initial)}
							onEdit={(recipe) => openEditor(recipe.id, recipe.definition)}
						/>
					</>
				)}
			</DashboardPage>

			<RecipeConfirmDialog
				cancelLabel='Keep editing'
				confirmLabel='Discard changes'
				description='Your edits to this recipe haven’t been saved.'
				onCancel={() => setPendingLeave(false)}
				onConfirm={showList}
				open={pendingLeave}
				title='Discard unsaved changes?'
			/>
		</>
	);
}
