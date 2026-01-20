import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { checkDashboardAuth } from './auth-check';
import { DashboardContent } from './dashboard-content';

// Loading fallback
function DashboardLoading() {
	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950'>
			<div className='h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-sky-500' />
		</div>
	);
}

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

	return (
		<Suspense fallback={<DashboardLoading />}>
			<DashboardContent />
		</Suspense>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
