import { Suspense } from 'react';
import { AccessDeniedContent } from './access-denied-content';

// Loading fallback for Suspense boundary
function AccessDeniedLoading() {
	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950'>
			<div className='w-48 h-48 rounded-full bg-zinc-800/50 animate-pulse' />
		</div>
	);
}

export default function AccessDeniedPage() {
	return (
		<Suspense fallback={<AccessDeniedLoading />}>
			<AccessDeniedContent />
		</Suspense>
	);
}

// Prevent caching - access state can change
export const dynamic = 'force-dynamic';
