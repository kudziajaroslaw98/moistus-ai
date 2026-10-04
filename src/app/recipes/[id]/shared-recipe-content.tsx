'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { SharedRecipeCard } from '@/components/recipes/shared-recipe-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import {
	installSharedRecipe,
	RecipeRequestError,
	SAVED_RECIPES_KEY,
} from '@/hooks/extensions/use-saved-recipes';
import type { SharedRecipe } from '@/lib/extensions/recipe-schema';
import { Check, Info, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';

interface SharedRecipeContentProps {
	recipe: SharedRecipe;
	isOwner: boolean;
}

/** Shared recipe page for signed-in accounts, inside the dashboard shell. */
export function SharedRecipeContent({ recipe, isOwner }: SharedRecipeContentProps) {
	const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');
	const author = recipe.authorName ?? 'the author';

	const addRecipe = async () => {
		setStatus('adding');
		try {
			await installSharedRecipe(recipe.id);
			await mutate(SAVED_RECIPES_KEY);
			setStatus('added');
			toast.success('Added to your recipes', {
				description: 'Open a map and find it under Recipes in the AI menu.',
			});
		} catch (error) {
			setStatus('idle');
			toast.error(
				error instanceof RecipeRequestError ? error.message : 'Could not add the recipe.'
			);
		}
	};

	const dashboardLink = (
		<Link className={buttonVariants({ variant: 'ghost' })} href='/dashboard'>
			Go to dashboard
		</Link>
	);

	return (
		<SidebarProvider>
			<DashboardLayout>
				<div className='p-6 md:p-8'>
					<div className='mx-auto max-w-3xl space-y-6'>
						<div className='space-y-2'>
							<p className='text-sm text-zinc-400'>Shared recipe</p>

							<h1 className='text-3xl font-bold tracking-tight text-white'>
								{recipe.definition.title}
							</h1>

							<p className='text-zinc-400'>
								{`Shared by ${recipe.authorName ?? 'a Shiko user'} · added by ${recipe.installCount} ${recipe.installCount === 1 ? 'person' : 'people'}`}
							</p>
						</div>

						<SharedRecipeCard
							recipe={recipe}
							actions={
								isOwner ? (
									<>
										<span className='self-center text-sm text-zinc-400'>
											This is your recipe
										</span>

										{dashboardLink}
									</>
								) : (
									<>
										{dashboardLink}

										<Button
											disabled={status !== 'idle'}
											onClick={addRecipe}
										>
											{status === 'adding' ? (
												<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											) : status === 'added' ? (
												<Check className='mr-2 h-4 w-4' />
											) : (
												<Plus className='mr-2 h-4 w-4' />
											)}

											{status === 'added' ? 'Added' : 'Add to my recipes'}
										</Button>
									</>
								)
							}
						/>

						<p className='flex items-start gap-2.5 text-sm leading-5 text-zinc-400'>
							<Info aria-hidden className='mt-0.5 size-3.5 shrink-0' />

							<span>
								{`Adding makes your own copy. If ${author} edits this recipe later, your copy stays as it is. Running recipes uses AI suggestions, which are part of Pro.`}
							</span>
						</p>
					</div>
				</div>
			</DashboardLayout>
		</SidebarProvider>
	);
}
