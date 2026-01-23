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

	return (
		<Suspense fallback={<TemplatesLoading />}>
			<TemplatesContent />
		</Suspense>
	);
}

// Prevent caching - user state can change
export const dynamic = 'force-dynamic';
