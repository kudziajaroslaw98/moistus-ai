'use client';

import { RecipeConfirmDialog } from '@/components/recipes/recipe-confirm-dialog';
import { RecipeEditor } from '@/components/recipes/recipe-editor';
import { RecipeList } from '@/components/recipes/recipe-list';
import { SidePanel } from '@/components/side-panel';
import useAppStore from '@/store/mind-map-store';
import type { RecipesPanelView } from '@/types/extensions';
import { ArrowUpRight, ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * AI recipes side panel: the list of saved and starter recipes, and the editor.
 * Non-modal, so "Try" results stay visible on the canvas and another node can be
 * selected while the panel is open.
 */
export function RecipesPanel() {
	const shouldReduceMotion = useReducedMotion();
	const { isOpen, view, setPopoverOpen, setRecipesPanelView } = useAppStore(
		useShallow((state) => ({
			isOpen: state.popoverOpen.recipes,
			view: state.recipesPanelView,
			setPopoverOpen: state.setPopoverOpen,
			setRecipesPanelView: state.setRecipesPanelView,
		}))
	);
	const isEditorDirty = useRef(false);
	const [pendingLeave, setPendingLeave] = useState<'close' | 'list' | null>(null);

	const handleDirtyChange = useCallback((isDirty: boolean) => {
		isEditorDirty.current = isDirty;
	}, []);

	const showView = (next: RecipesPanelView) => {
		isEditorDirty.current = false;
		setRecipesPanelView(next);
	};

	const leave = (target: 'close' | 'list') => {
		setPendingLeave(null);
		if (target === 'close') {
			isEditorDirty.current = false;
			setPopoverOpen({ recipes: false });
			setRecipesPanelView({ mode: 'list' });
		} else {
			showView({ mode: 'list' });
		}
	};

	const requestLeave = (target: 'close' | 'list') => {
		if (view.mode === 'edit' && isEditorDirty.current) {
			setPendingLeave(target);
			return;
		}
		leave(target);
	};

	const isEditing = view.mode === 'edit';
	const title = !isEditing
		? 'Recipes'
		: view.recipeId
			? 'Edit recipe'
			: 'New recipe';
	const slide = shouldReduceMotion ? 0 : 16;

	return (
		<>
			<SidePanel
				bodyClassName='p-0'
				data-testid='recipes-panel'
				isOpen={isOpen}
				modal={false}
				onClose={() => requestLeave('close')}
				title={title}
				subtitle={
					isEditing ? (
						<button
							className='inline-flex items-center gap-0.5 rounded-sm text-text-secondary transition-colors duration-200 ease hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
							onClick={() => requestLeave('list')}
							type='button'
						>
							<ChevronLeft aria-hidden className='size-3.5' />
							All recipes
						</button>
					) : (
						<Link
							className='inline-flex items-center gap-0.5 rounded-sm text-text-secondary transition-colors duration-200 ease hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
							href='/dashboard/recipes'
						>
							Open Recipes page
							<ArrowUpRight aria-hidden className='size-3.5' />
						</Link>
					)
				}
			>
				<AnimatePresence initial={false} mode='wait'>
					<motion.div
						animate={{ opacity: 1, x: 0 }}
						className='flex min-h-0 flex-1 flex-col'
						exit={{ opacity: 0, x: isEditing ? slide : -slide }}
						initial={{ opacity: 0, x: isEditing ? slide : -slide }}
						key={view.mode === 'edit' ? `editor-${view.instance}` : 'list'}
						transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' }}
					>
						{view.mode === 'edit' ? (
							<RecipeEditor
								showTry
								initial={view.initial}
								onClose={() => requestLeave('close')}
								onDirtyChange={handleDirtyChange}
								recipeId={view.recipeId}
								onSaved={(recipe) =>
									// Same instance: the form stays mounted with the saved values.
									setRecipesPanelView({
										mode: 'edit',
										recipeId: recipe.id,
										initial: recipe.definition,
										instance: view.instance,
									})
								}
							/>
						) : (
							<RecipeList
								onCreate={(initial) =>
									showView({ mode: 'edit', recipeId: null, initial })
								}
								onEdit={(recipe) =>
									showView({
										mode: 'edit',
										recipeId: recipe.id,
										initial: recipe.definition,
									})
								}
							/>
						)}
					</motion.div>
				</AnimatePresence>
			</SidePanel>

			<RecipeConfirmDialog
				cancelLabel='Keep editing'
				confirmLabel='Discard changes'
				description='Your edits to this recipe haven’t been saved.'
				onCancel={() => setPendingLeave(null)}
				onConfirm={() => pendingLeave && leave(pendingLeave)}
				open={pendingLeave !== null}
				title='Discard unsaved changes?'
			/>
		</>
	);
}
