import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DashboardRouteLoadingSkeleton } from '@/components/dashboard/dashboard-loading-skeleton';
import { SubscriptionStateHydrator } from '@/components/providers/subscription-hydration-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar-cookie';
import { DASHBOARD_PATH_HEADER } from '@/helpers/dashboard/dashboard-path-header';
import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { checkDashboardAuth } from './auth-check';

/** The plan streams in after the shell; until then the shell shows its loading state. */
async function StreamedSubscriptionState({ userId }: { userId: string }) {
	const subscriptionState = await getServerSubscriptionHydrationState(userId);
	return <SubscriptionStateHydrator subscriptionState={subscriptionState} />;
}

/** Checks the session, then renders the real shell (signed-out visitors go to sign-in). */
async function SignedInDashboard({
	children,
	sidebarOpen,
}: {
	children: ReactNode;
	sidebarOpen: boolean;
}) {
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		const path = (await headers()).get(DASHBOARD_PATH_HEADER);
		const from = path?.startsWith('/dashboard') ? path : '/dashboard';
		redirect(
			auth.reason === 'anonymous'
				? '/auth/sign-in?message=Please+sign+in+to+access+your+dashboard'
				: `/auth/sign-in?redirectedFrom=${encodeURIComponent(from)}`
		);
	}

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<DashboardLayout>{children}</DashboardLayout>

			<Suspense fallback={null}>
				<StreamedSubscriptionState userId={auth.userId} />
			</Suspense>
		</SidebarProvider>
	);
}

/**
 * Shared shell for every /dashboard page. Layouts stay mounted and are not re-rendered
 * when you move between their pages, so the sidebar, top bar (with notifications) and
 * the auth + plan lookups run once per visit instead of on every click. Each section's
 * loading.tsx covers only its own content.
 *
 * On entry the whole-dashboard skeleton shows while the session is checked. That check
 * runs on full loads and when entering /dashboard from another route, not on clicks
 * between dashboard pages; pages load their data through /api routes, which check the
 * session themselves.
 */
export default async function DashboardRouteLayout({
	children,
}: {
	children: ReactNode;
}) {
	const sidebarOpen =
		(await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== 'false';

	return (
		<Suspense
			fallback={
				<DashboardRouteLoadingSkeleton sidebarCollapsed={!sidebarOpen} />
			}
		>
			<SignedInDashboard sidebarOpen={sidebarOpen}>
				{children}
			</SignedInDashboard>
		</Suspense>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
