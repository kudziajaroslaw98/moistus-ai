import { SubscriptionHydrationProvider } from '@/components/providers/subscription-hydration-provider';
import { isUserAdmin } from '@/helpers/auth/is-admin';
import { getServerSubscriptionHydrationState } from '@/helpers/subscription/get-server-subscription-hydration-state';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { checkDashboardAuth } from '../auth-check';
import { TemplatesContent } from './templates-content';

// Loading fallback
function TemplatesLoading() {
	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950'>
			<div className='h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-sky-500' />
		</div>
	);
}

/**
 * Server component wrapper for templates page.
 * Validates auth server-side before rendering client component.
 */
export default async function TemplatesPage() {
	const auth = await checkDashboardAuth();

	if (!auth.authorized) {
		const redirectPath =
			auth.reason === 'anonymous'
				? '/auth/sign-in?message=Please+sign+in+to+browse+templates'
				: '/auth/sign-in?redirectedFrom=/dashboard/templates';
		redirect(redirectPath);
	}

	const [initialSubscriptionState, isAdmin] = await Promise.all([
		getServerSubscriptionHydrationState(auth.userId),
		isUserAdmin(createServiceRoleClient(), auth.userId),
	]);

	return (
		<Suspense fallback={<TemplatesLoading />}>
			<SubscriptionHydrationProvider
				initialSubscriptionState={initialSubscriptionState}
			>
				<TemplatesContent isAdmin={isAdmin} />
			</SubscriptionHydrationProvider>
		</Suspense>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
