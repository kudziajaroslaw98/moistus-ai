'use client';

import {
	CARD_MENU_TRIGGER_CLASS,
	CardMenuIcon,
	CatalogCard,
	CatalogCardSkeleton,
	CatalogEmptyState,
	CatalogGrid,
	type CatalogChip,
} from '@/components/dashboard/catalog-card';
import { CreateTile } from '@/components/dashboard/create-tile';
import { CARD_BUTTON_CLASS } from '@/components/dashboard/dashboard-page';
import { useDashboardSearch } from '@/components/dashboard/dashboard-shell-context';
import {
	UnderlineTab,
	UnderlineTabsBar,
	UnderlineTabsList,
} from '@/components/dashboard/underline-tabs';
import { ViewToggle } from '@/components/dashboard/view-toggle';
import { RecipeConfirmDialog } from '@/components/recipes/recipe-confirm-dialog';
import {
	duplicateDefinition,
	recipeShareUrl,
} from '@/components/recipes/recipe-list';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs } from '@/components/ui/tabs';
import {
	RecipeRequestError,
	useSavedRecipes,
} from '@/hooks/extensions/use-saved-recipes';
import {
	describeRecipe,
	RECIPE_ICONS,
	RECIPE_SCOPE_HUES,
	RECIPE_SCOPE_INFO,
} from '@/lib/extensions/recipe-icons';
import {
	MAX_SAVED_RECIPES,
	type RecipeDefinition,
	type RecipeRef,
	type SavedRecipe,
} from '@/lib/extensions/recipe-schema';
import { STARTER_RECIPES } from '@/lib/extensions/starter-recipes';
import type { DashboardViewMode } from '@/types/dashboard-map';
import { Copy, Link2, Link2Off, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type RecipeTab = 'all' | 'mine' | 'starters';

function matchesQuery(recipe: RecipeRef, query: string) {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return `${recipe.definition.title} ${recipe.definition.description}`
		.toLowerCase()
		.includes(needle);
}

interface RecipesGridProps {
	onEdit: (recipe: SavedRecipe) => void;
	onCreate: (initial: RecipeDefinition | null) => void;
}

/**
 * Dashboard Recipes: your saved recipes and the starters as catalog cards. Every card
 * has the same button ("Edit" for yours, "Duplicate" for starters); the in-map recipes
 * panel keeps its own compact `RecipeList`.
 */
export function RecipesGrid({ onEdit, onCreate }: RecipesGridProps) {
	const {
		recipes,
		isLoading,
		error,
		canSaveRecipes,
		updateRecipe,
		deleteRecipe,
	} = useSavedRecipes();
	const { query, setQuery } = useDashboardSearch();
	const [tab, setTab] = useState<RecipeTab>('all');
	const [viewMode, setViewMode] = useState<DashboardViewMode>('grid');
	const [pendingDelete, setPendingDelete] = useState<SavedRecipe | null>(null);

	const isAtLimit = recipes.length >= MAX_SAVED_RECIPES;
	const mine = useMemo(
		() => recipes.filter((recipe) => matchesQuery(recipe, query)),
		[recipes, query]
	);
	const starters = useMemo(
		() => STARTER_RECIPES.filter((recipe) => matchesQuery(recipe, query)),
		[query]
	);
	const showMine = tab !== 'starters' && canSaveRecipes;
	const showStarters = tab !== 'mine';
	const visibleCount =
		(showMine ? mine.length : 0) + (showStarters ? starters.length : 0);
	const showSkeleton = canSaveRecipes && isLoading && !error;
	// The tile is the way to start a recipe, so it stays with "Your recipes".
	const showTile = canSaveRecipes && tab !== 'starters' && !query.trim();

	const reportFailure = (fallback: string) => (failure: unknown) =>
		toast.error(
			failure instanceof RecipeRequestError ? failure.message : fallback
		);

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
			.then(() =>
				toast.success('Link turned off', {
					description: 'Only you can see this recipe.',
				})
			)
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

	const chipsFor = (recipe: RecipeRef, isStarter: boolean): CatalogChip[] => [
		{ label: RECIPE_SCOPE_INFO[recipe.definition.scope].short },
		...(isStarter ? [{ label: 'Starter' }] : []),
		...((recipe as Partial<SavedRecipe>).visibility === 'unlisted'
			? [{ label: 'Shared', tone: 'green' as const }]
			: []),
	];

	const renderCard = (recipe: RecipeRef, isStarter: boolean) => {
		const { definition } = recipe;
		const saved = isStarter ? null : (recipe as SavedRecipe);
		const duplicate = () => onCreate(duplicateDefinition(definition));

		return (
			<CatalogCard
				chips={chipsFor(recipe, isStarter)}
				description={definition.description}
				hue={RECIPE_SCOPE_HUES[definition.scope]}
				icon={RECIPE_ICONS[definition.icon].icon}
				key={recipe.id}
				meta={describeRecipe(definition)}
				title={definition.title}
				viewMode={viewMode}
				onOpen={
					saved ? () => onEdit(saved) : canSaveRecipes ? duplicate : undefined
				}
				action={
					<button
						className={CARD_BUTTON_CLASS}
						disabled={isStarter && (!canSaveRecipes || isAtLimit)}
						onClick={saved ? () => onEdit(saved) : duplicate}
						type='button'
					>
						{saved ? 'Edit' : 'Duplicate'}
					</button>
				}
				menu={
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`Options for ${definition.title}`}
							className={CARD_MENU_TRIGGER_CLASS}
						>
							<CardMenuIcon />
						</DropdownMenuTrigger>

						<DropdownMenuContent align='end'>
							{saved ? (
								<>
									<DropdownMenuItem onClick={() => onEdit(saved)}>
										<Pencil />
										Edit
									</DropdownMenuItem>

									<DropdownMenuItem disabled={isAtLimit} onClick={duplicate}>
										<Copy />
										Duplicate
									</DropdownMenuItem>

									<DropdownMenuItem onClick={() => copyShareLink(saved)}>
										<Link2 />
										Copy share link
									</DropdownMenuItem>

									{saved.visibility === 'unlisted' && (
										<DropdownMenuItem onClick={() => stopSharing(saved)}>
											<Link2Off />
											Turn off link
										</DropdownMenuItem>
									)}

									<DropdownMenuSeparator />

									<DropdownMenuItem
										onClick={() => setPendingDelete(saved)}
										variant='destructive'
									>
										<Trash2 />
										Delete
									</DropdownMenuItem>
								</>
							) : (
								<DropdownMenuItem
									disabled={!canSaveRecipes || isAtLimit}
									onClick={duplicate}
								>
									<Copy />
									Duplicate to edit
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				}
			/>
		);
	};

	return (
		<>
			<Tabs
				className='mt-9 gap-0'
				onValueChange={(value) => setTab(value as RecipeTab)}
				value={tab}
			>
				<UnderlineTabsBar>
					<UnderlineTabsList aria-label='Filter recipes'>
						<UnderlineTab
							count={
								(canSaveRecipes ? recipes.length : 0) + STARTER_RECIPES.length
							}
							value='all'
						>
							All
						</UnderlineTab>

						{canSaveRecipes && (
							<UnderlineTab count={recipes.length} value='mine'>
								Your recipes
							</UnderlineTab>
						)}

						<UnderlineTab count={STARTER_RECIPES.length} value='starters'>
							Starters
						</UnderlineTab>
					</UnderlineTabsList>

					<ViewToggle
						className='mb-1.5'
						onChange={setViewMode}
						value={viewMode}
					/>
				</UnderlineTabsBar>
			</Tabs>

			{error && canSaveRecipes && (
				<p className='mt-6 text-sm text-zinc-400'>
					Could not load your recipes. Reload to try again.
				</p>
			)}

			{!canSaveRecipes && (
				<p className='mt-6 text-sm text-zinc-400'>
					Create an account to save your own recipes. The starters below work
					for everyone.
				</p>
			)}

			{visibleCount === 0 && !showSkeleton && !showTile ? (
				<CatalogEmptyState
					actionLabel='Show all recipes'
					hint='Try another search term.'
					onAction={() => {
						setQuery('');
						setTab('all');
					}}
					title='No recipes found'
				/>
			) : (
				<CatalogGrid className='mt-6' viewMode={viewMode}>
					{showSkeleton ? (
						<CatalogCardSkeleton count={4} viewMode={viewMode} />
					) : (
						showMine && mine.map((recipe) => renderCard(recipe, false))
					)}

					{showStarters && starters.map((recipe) => renderCard(recipe, true))}

					{showTile && (
						<CreateTile
							disabled={isAtLimit}
							hint={
								isAtLimit
									? `Limit reached (${MAX_SAVED_RECIPES})`
									: `${recipes.length} of ${MAX_SAVED_RECIPES} saved`
							}
							onClick={() => onCreate(null)}
							title='New recipe'
							viewMode={viewMode}
						/>
					)}
				</CatalogGrid>
			)}

			<RecipeConfirmDialog
				confirmLabel='Delete recipe'
				description='It disappears from your AI menus. People who already added it keep their own copy.'
				onCancel={() => setPendingDelete(null)}
				onConfirm={confirmDelete}
				open={pendingDelete !== null}
				title={`Delete “${pendingDelete?.definition.title ?? ''}”?`}
			/>
		</>
	);
}
