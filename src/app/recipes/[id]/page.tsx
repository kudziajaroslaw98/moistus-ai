import { SubscriptionHydrationProvider } from '@/components/providers/subscription-hydration-provider';
import { loadSharedRecipe } from '@/helpers/recipes/saved-recipe-rows';
import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { checkDashboardAuth } from '@/app/dashboard/auth-check';
import { SharedRecipeContent } from './shared-recipe-content';
import { SharedRecipePublic } from './shared-recipe-public';

type PageProps = { params: Promise<{ id: string }> };

// Shared by metadata and the page within one request.
const getSharedRecipe = cache(async (id: string) => {
	const parsedId = z.string().uuid().safeParse(id);
	return parsedId.success ? loadSharedRecipe(parsedId.data) : null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const recipe = await getSharedRecipe((await params).id);
	return {
		title: recipe ? `${recipe.definition.title} · Shiko recipe` : 'Recipe not found',
		// Unlisted: reachable by link only.
		robots: { index: false, follow: false },
	};
}

/**
 * A recipe shared by link (unlisted). Anyone with the link can read it; signed-in
 * accounts can add their own copy.
 */
export default async function SharedRecipePage({ params }: PageProps) {
	const shared = await getSharedRecipe((await params).id);
	if (!shared) notFound();

	const { ownerId, ...recipe } = shared;
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		return <SharedRecipePublic isGuest={auth.reason === 'anonymous'} recipe={recipe} />;
	}

	const initialSubscriptionState = await getServerSubscriptionHydrationState(
		auth.userId
	);

	return (
		<SubscriptionHydrationProvider initialSubscriptionState={initialSubscriptionState}>
			<SharedRecipeContent isOwner={auth.userId === ownerId} recipe={recipe} />
		</SubscriptionHydrationProvider>
	);
}

export const dynamic = 'force-dynamic';
