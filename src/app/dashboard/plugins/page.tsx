import { SubscriptionHydrationProvider } from '@/components/providers/subscription-hydration-provider';
import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import { redirect } from 'next/navigation';
import { checkDashboardAuth } from '../auth-check';
import { PluginsContent } from './plugins-content';

/** Shiko plugins and the maps they're on; turning one on for a map works from here too. */
export default async function PluginsPage() {
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		redirect(
			auth.reason === 'anonymous'
				? '/auth/sign-in?message=Please+sign+in+to+use+plugins'
				: '/auth/sign-in?redirectedFrom=/dashboard/plugins'
		);
	}

	const initialSubscriptionState = await getServerSubscriptionHydrationState(
		auth.userId
	);

	return (
		<SubscriptionHydrationProvider initialSubscriptionState={initialSubscriptionState}>
			<PluginsContent />
		</SubscriptionHydrationProvider>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
