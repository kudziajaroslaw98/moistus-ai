import { SubscriptionHydrationProvider } from '@/components/providers/subscription-hydration-provider';
import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import { redirect } from 'next/navigation';
import { checkDashboardAuth } from '../../auth-check';
import { MyPluginsContent } from './my-plugins-content';

/** Your library plugins: their versions, review status and what Shiko said. */
export default async function MyPluginsPage() {
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		redirect(
			auth.reason === 'anonymous'
				? '/auth/sign-in?message=Please+sign+in+to+use+plugins'
				: '/auth/sign-in?redirectedFrom=/dashboard/plugins/mine'
		);
	}

	const initialSubscriptionState = await getServerSubscriptionHydrationState(
		auth.userId
	);

	return (
		<SubscriptionHydrationProvider initialSubscriptionState={initialSubscriptionState}>
			<MyPluginsContent />
		</SubscriptionHydrationProvider>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
