import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import { redirect } from 'next/navigation';
import { checkDashboardAuth } from './auth-check';
import { DashboardContent } from './dashboard-content';

/**
 * Server component wrapper for dashboard.
 * Validates auth server-side before rendering client component.
 */
export default async function DashboardPage() {
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		const redirectPath =
			auth.reason === 'anonymous'
				? '/auth/sign-in?message=Please+sign+in+to+access+your+dashboard'
				: '/auth/sign-in?redirectedFrom=/dashboard';
		redirect(redirectPath);
	}

	const initialSubscriptionState = await getServerSubscriptionHydrationState(
		auth.userId
	);

	return (
		<DashboardContent initialSubscriptionState={initialSubscriptionState} />
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
