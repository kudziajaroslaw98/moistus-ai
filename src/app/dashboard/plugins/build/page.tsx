import { SubscriptionHydrationProvider } from '@/components/providers/subscription-hydration-provider';
import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import { redirect } from 'next/navigation';
import { checkDashboardAuth } from '../../auth-check';
import { BuildGuideContent } from './build-guide-content';

/** How to build a Shiko plugin: quick start with a starter, then the reference. */
export default async function BuildPluginGuidePage() {
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		redirect(
			auth.reason === 'anonymous'
				? '/auth/sign-in?message=Please+sign+in+to+use+plugins'
				: '/auth/sign-in?redirectedFrom=/dashboard/plugins/build'
		);
	}

	const initialSubscriptionState = await getServerSubscriptionHydrationState(
		auth.userId
	);

	return (
		<SubscriptionHydrationProvider initialSubscriptionState={initialSubscriptionState}>
			<BuildGuideContent />
		</SubscriptionHydrationProvider>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
