import { SharedRecipeCard } from '@/components/recipes/shared-recipe-card';
import { buttonVariants } from '@/components/ui/button';
import type { SharedRecipe } from '@/lib/extensions/recipe-schema';
import Image from 'next/image';
import Link from 'next/link';

interface SharedRecipePublicProps {
	recipe: SharedRecipe;
	/** Guests (anonymous sessions) are signed in but can't save recipes. */
	isGuest: boolean;
}

/** Shared recipe page for visitors without an account: read it, then sign in to add it. */
export function SharedRecipePublic({ recipe, isGuest }: SharedRecipePublicProps) {
	const signInHref = `/auth/sign-in?redirectedFrom=${encodeURIComponent(`/recipes/${recipe.id}`)}`;

	return (
		<div className='min-h-screen bg-zinc-950 text-text-primary'>
			<header className='flex h-14 items-center border-b border-zinc-900 px-4 md:px-6'>
				<Link aria-label='Shiko home' href='/'>
					<Image alt='Shiko Logo' height={80} src='/images/shiko.svg' width={120} />
				</Link>
			</header>

			<main className='mx-auto max-w-3xl space-y-6 px-4 py-10 md:px-6'>
				<div className='space-y-2'>
					<p className='text-sm text-zinc-400'>Shared recipe</p>

					<h1 className='text-3xl font-bold tracking-tight text-white'>
						{recipe.definition.title}
					</h1>

					<p className='text-zinc-400'>
						An AI recipe for Shiko mind maps: it suggests new ideas that you accept or
						reject.
					</p>
				</div>

				<SharedRecipeCard
					recipe={recipe}
					actions={
						<Link className={buttonVariants()} href={signInHref}>
							Sign in to add
						</Link>
					}
				/>

				<p className='text-sm text-zinc-400'>
					{isGuest
						? 'Guest sessions can’t save recipes. Sign in or create an account to add it.'
						: 'You need a Shiko account to add recipes. Adding makes your own copy.'}
				</p>
			</main>
		</div>
	);
}
