'use client';

import { RecipeConfirmDialog } from '@/components/recipes/recipe-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
	RecipeRequestError,
	useSavedRecipes,
} from '@/hooks/extensions/use-saved-recipes';
import { describeRecipe, RECIPE_ICONS } from '@/lib/extensions/recipe-icons';
import {
	MAX_SAVED_RECIPES,
	RECIPE_LIMITS,
	type RecipeDefinition,
	type RecipeRef,
	type SavedRecipe,
} from '@/lib/extensions/recipe-schema';
import { STARTER_RECIPES } from '@/lib/extensions/starter-recipes';
import { cn } from '@/utils/cn';
import {
	Copy,
	Link2,
	Link2Off,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Trash2,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

export const recipeShareUrl = (id: string) =>
	`${typeof window === 'undefined' ? '' : window.location.origin}/recipes/${id}`;

/** A copy keeps the definition and gets a "(copy)" name that still fits the limit. */
export function duplicateDefinition(definition: RecipeDefinition): RecipeDefinition {
	const suffix = ' (copy)';
	return {
		...definition,
		title: `${definition.title.slice(0, RECIPE_LIMITS.title - suffix.length)}${suffix}`,
	};
}

function matchesQuery(recipe: RecipeRef, query: string) {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return `${recipe.definition.title} ${recipe.definition.description}`
		.toLowerCase()
		.includes(needle);
}

function GroupHeader({ label, count }: { label: string; count: number }) {
	return (
		<div className='flex items-center gap-2.5 px-2 pb-2 pt-1'>
			<h3 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
				{label}
			</h3>

			<span aria-hidden className='h-px flex-1 bg-white/[0.08]' />

			<span className='text-[12px] tabular-nums text-white/55'>{count}</span>
		</div>
	);
}

interface RecipeRowProps {
	recipe: RecipeRef;
	isStarter: boolean;
	index: number;
	onOpen?: () => void;
	children: ReactNode;
}

function RecipeRow({ recipe, isStarter, index, onOpen, children }: RecipeRowProps) {
	const shouldReduceMotion = useReducedMotion();
	const Icon = RECIPE_ICONS[recipe.definition.icon].icon;
	const isShared = (recipe as Partial<SavedRecipe>).visibility === 'unlisted';
	const content = (
		<>
			<span
				className={cn(
					'mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
					isStarter ? 'bg-white/[0.06] text-text-secondary' : 'bg-violet-500/15 text-violet-300'
				)}
			>
				<Icon aria-hidden className='size-3.5' />
			</span>

			<span className='flex min-w-0 flex-1 flex-col'>
				<span className='truncate text-[14px] font-medium leading-5 text-white/92'>
					{recipe.definition.title}
				</span>

				<span className='truncate text-[12.5px] leading-5 text-white/55'>
					{describeRecipe(recipe.definition)}

					{isShared && <span className='text-primary-200'> · Shared</span>}
				</span>
			</span>
		</>
	);

	return (
		<motion.li
			animate={{ opacity: 1, y: 0 }}
			className='group/row flex items-center gap-1 rounded-lg transition-colors duration-200 ease hover:bg-white/[0.035]'
			initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: { delay: Math.min(index, 8) * 0.03, duration: 0.2, ease: 'easeOut' }
			}
		>
			{onOpen ? (
				<button
					className='flex min-w-0 flex-1 items-start gap-3 rounded-lg py-2 pl-2.5 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/60'
					onClick={onOpen}
					type='button'
				>
					{content}
				</button>
			) : (
				<div className='flex min-w-0 flex-1 items-start gap-3 py-2 pl-2.5 pr-1'>
					{content}
				</div>
			)}

			<div className='pr-1.5'>{children}</div>
		</motion.li>
	);
}

function RowMenuTrigger({ title }: { title: string }) {
	return (
		<DropdownMenuTrigger
			aria-label={`Options for ${title}`}
			className='flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors duration-200 ease hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 data-[popup-open]:bg-white/[0.06]'
		>
			<MoreHorizontal className='size-4' />
		</DropdownMenuTrigger>
	);
}

interface RecipeListProps {
	onEdit: (recipe: SavedRecipe) => void;
	onCreate: (initial: RecipeDefinition | null) => void;
}

export function RecipeList({ onEdit, onCreate }: RecipeListProps) {
	const { recipes, isLoading, error, canSaveRecipes, updateRecipe, deleteRecipe } =
		useSavedRecipes();
	const [query, setQuery] = useState('');
	const [pendingDelete, setPendingDelete] = useState<SavedRecipe | null>(null);

	const visibleRecipes = useMemo(
		() => recipes.filter((recipe) => matchesQuery(recipe, query)),
		[recipes, query]
	);
	const visibleStarters = useMemo(
		() => STARTER_RECIPES.filter((recipe) => matchesQuery(recipe, query)),
		[query]
	);
	const isAtLimit = recipes.length >= MAX_SAVED_RECIPES;

	const reportFailure = (fallback: string) => (failure: unknown) =>
		toast.error(failure instanceof RecipeRequestError ? failure.message : fallback);

	const copyShareLink = async (recipe: SavedRecipe) => {
		try {
			if (recipe.visibility !== 'unlisted') {
				await updateRecipe(recipe.id, { visibility: 'unlisted' });
			}
			await navigator.clipboard.writeText(recipeShareUrl(recipe.id));
			toast.success('Link copied', {
				description: 'Anyone with the link can view and add this recipe.',
			});
		} catch (failure) {
			reportFailure('Could not copy the link.')(failure);
		}
	};

	const stopSharing = (recipe: SavedRecipe) =>
		updateRecipe(recipe.id, { visibility: 'private' })
			.then(() => toast.success('Link turned off', { description: 'Only you can see this recipe.' }))
			.catch(reportFailure('Could not turn off the link.'));

	const confirmDelete = async () => {
		if (!pendingDelete) return;
		const recipe = pendingDelete;
		setPendingDelete(null);
		try {
			await deleteRecipe(recipe.id);
			toast.success(`Deleted “${recipe.definition.title}”`);
		} catch (failure) {
			reportFailure('Could not delete the recipe.')(failure);
		}
	};

	return (
		<div className='flex min-h-0 flex-1 flex-col'>
			<div className='min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4'>
				<div className='relative'>
					<Search
						aria-hidden
						className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary'
					/>

					<input
						aria-label='Search recipes'
						className='block h-9 w-full rounded-lg border border-zinc-700/50 bg-zinc-800/30 pl-9 pr-3 text-sm text-text-primary placeholder-zinc-400 shadow-sm transition-all duration-200 hover:border-zinc-600/50 focus:border-primary-400/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
						onChange={(event) => setQuery(event.target.value)}
						placeholder='Search recipes…'
						type='search'
						value={query}
					/>
				</div>

				{canSaveRecipes && (
					<section>
						<GroupHeader count={recipes.length} label='Your recipes' />

						{isLoading ? (
							<div className='space-y-2 px-2'>
								<Skeleton className='h-11 w-full rounded-lg' />

								<Skeleton className='h-11 w-full rounded-lg' />
							</div>
						) : error ? (
							<p className='px-2 py-3 text-sm text-text-secondary'>
								Could not load your recipes. Close the panel and try again.
							</p>
						) : visibleRecipes.length === 0 ? (
							<p className='px-2 py-3 text-sm text-text-secondary'>
								{recipes.length === 0
									? 'No recipes yet. Create one, or duplicate a starter below.'
									: 'No recipes match your search.'}
							</p>
						) : (
							<ul className='space-y-0.5'>
								{visibleRecipes.map((recipe, index) => (
									<RecipeRow
										index={index}
										isStarter={false}
										key={recipe.id}
										onOpen={() => onEdit(recipe)}
										recipe={recipe}
									>
										<DropdownMenu>
											<RowMenuTrigger title={recipe.definition.title} />

											<DropdownMenuContent align='end'>
												<DropdownMenuItem onClick={() => onEdit(recipe)}>
													<Pencil />
													Edit
												</DropdownMenuItem>

												<DropdownMenuItem
													disabled={isAtLimit}
													onClick={() => onCreate(duplicateDefinition(recipe.definition))}
												>
													<Copy />
													Duplicate
												</DropdownMenuItem>

												<DropdownMenuItem onClick={() => copyShareLink(recipe)}>
													<Link2 />
													Copy share link
												</DropdownMenuItem>

												{recipe.visibility === 'unlisted' && (
													<DropdownMenuItem onClick={() => stopSharing(recipe)}>
														<Link2Off />
														Turn off link
													</DropdownMenuItem>
												)}

												<DropdownMenuSeparator />

												<DropdownMenuItem
													onClick={() => setPendingDelete(recipe)}
													variant='destructive'
												>
													<Trash2 />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</RecipeRow>
								))}
							</ul>
						)}
					</section>
				)}

				<section>
					<GroupHeader count={STARTER_RECIPES.length} label='Starters' />

					{visibleStarters.length === 0 ? (
						<p className='px-2 py-3 text-sm text-text-secondary'>
							No starters match your search.
						</p>
					) : (
						<ul className='space-y-0.5'>
							{visibleStarters.map((recipe, index) => (
								<RecipeRow
									isStarter
									index={index}
									key={recipe.id}
									recipe={recipe}
								>
									{canSaveRecipes && (
										<DropdownMenu>
											<RowMenuTrigger title={recipe.definition.title} />

											<DropdownMenuContent align='end'>
												<DropdownMenuItem
													disabled={isAtLimit}
													onClick={() => onCreate(duplicateDefinition(recipe.definition))}
												>
													<Copy />
													Duplicate to edit
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</RecipeRow>
							))}
						</ul>
					)}
				</section>
			</div>

			<div className='flex h-fit shrink-0 items-center justify-between gap-3 border-t border-zinc-800 bg-base p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
				<p className='text-sm text-text-secondary'>
					{canSaveRecipes
						? `${recipes.length} of ${MAX_SAVED_RECIPES} recipes`
						: 'Create an account to save recipes'}
				</p>

				<Button
					disabled={!canSaveRecipes || isAtLimit}
					onClick={() => onCreate(null)}
				>
					<Plus className='mr-2 h-4 w-4' />
					New recipe
				</Button>
			</div>

			<RecipeConfirmDialog
				confirmLabel='Delete recipe'
				description='It disappears from your AI menus. People who already added it keep their own copy.'
				onCancel={() => setPendingDelete(null)}
				onConfirm={confirmDelete}
				open={pendingDelete !== null}
				title={`Delete “${pendingDelete?.definition.title ?? ''}”?`}
			/>
		</div>
	);
}
