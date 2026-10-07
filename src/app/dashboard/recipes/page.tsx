import { SubscriptionHydrationProvider } from '@/components/providers/subscription-hydration-provider';
import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import { redirect } from 'next/navigation';
import { checkDashboardAuth } from '../auth-check';
import { RecipesContent } from './recipes-content';

/**
 * Your AI recipes outside a map: list, create, edit, share and delete. Trying a
 * recipe still happens in a map (the recipes side panel).
 */
export default async function RecipesPage() {
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		redirect(
			auth.reason === 'anonymous'
				? '/auth/sign-in?message=Please+sign+in+to+manage+recipes'
				: '/auth/sign-in?redirectedFrom=/dashboard/recipes'
		);
	}

	const initialSubscriptionState = await getServerSubscriptionHydrationState(
		auth.userId
	);

	return (
		<SubscriptionHydrationProvider initialSubscriptionState={initialSubscriptionState}>
			<RecipesContent />
		</SubscriptionHydrationProvider>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
