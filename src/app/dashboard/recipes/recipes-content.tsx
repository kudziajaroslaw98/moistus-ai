'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { RecipeConfirmDialog } from '@/components/recipes/recipe-confirm-dialog';
import { RecipeEditor } from '@/components/recipes/recipe-editor';
import { RecipeList } from '@/components/recipes/recipe-list';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecipeDefinition } from '@/lib/extensions/recipe-schema';
import useAppStore from '@/store/mind-map-store';
import { ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type PageView =
	| { mode: 'list' }
	| {
			mode: 'edit';
			recipeId: string | null;
			initial: RecipeDefinition | null;
			/** A new key resets the form; saving keeps it so the editor stays mounted. */
			key: number;
	  };

/** Dashboard Recipes page: the recipes panel's list and editor, without a map. */
export function RecipesContent() {
	const shouldReduceMotion = useReducedMotion();
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

	const isEditing = view.mode === 'edit';
	const slide = shouldReduceMotion ? 0 : 16;

	return (
		<SidebarProvider>
			<DashboardLayout>
				<div className='p-6 md:p-8'>
					<div className='mx-auto flex max-w-3xl flex-col gap-6'>
						<div className='space-y-2'>
							{isEditing ? (
								<button
									className='inline-flex items-center gap-0.5 rounded-sm text-sm text-zinc-400 transition-colors duration-200 ease hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
									onClick={requestList}
									type='button'
								>
									<ChevronLeft aria-hidden className='size-4' />
									All recipes
								</button>
							) : null}

							<h1 className='text-3xl font-bold tracking-tight text-white'>
								{!isEditing
									? 'Recipes'
									: view.recipeId
										? 'Edit recipe'
										: 'New recipe'}
							</h1>

							<p className='text-zinc-400'>
								AI actions you write once and run on any map. Every result is a
								suggestion you accept or reject.
							</p>
						</div>

						<div className='flex h-[calc(100dvh-16rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-base'>
							{!hasUser ? (
								// Until the user loads, the list would say "Create an account to save recipes".
								<div
									aria-busy
									className='space-y-2 p-4'
									data-testid='recipes-page-loading'
								>
									<Skeleton className='h-9 w-full rounded-lg' />

									<Skeleton className='h-11 w-full rounded-lg' />

									<Skeleton className='h-11 w-full rounded-lg' />
								</div>
							) : (
								<AnimatePresence initial={false} mode='wait'>
									<motion.div
										animate={{ opacity: 1, x: 0 }}
										className='flex min-h-0 flex-1 flex-col'
										exit={{ opacity: 0, x: isEditing ? slide : -slide }}
										initial={{ opacity: 0, x: isEditing ? slide : -slide }}
										key={view.mode === 'edit' ? `editor-${view.key}` : 'list'}
										transition={{
											duration: shouldReduceMotion ? 0 : 0.2,
											ease: 'easeOut',
										}}
									>
										{view.mode === 'edit' ? (
											<RecipeEditor
												initial={view.initial}
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
										) : (
											<RecipeList
												onCreate={(initial) => openEditor(null, initial)}
												onEdit={(recipe) =>
													openEditor(recipe.id, recipe.definition)
												}
											/>
										)}
									</motion.div>
								</AnimatePresence>
							)}
						</div>
					</div>
				</div>
			</DashboardLayout>

			<RecipeConfirmDialog
				cancelLabel='Keep editing'
				confirmLabel='Discard changes'
				description='Your edits to this recipe haven’t been saved.'
				onCancel={() => setPendingLeave(false)}
				onConfirm={showList}
				open={pendingLeave}
				title='Discard unsaved changes?'
			/>
		</SidebarProvider>
	);
}
