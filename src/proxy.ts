import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy middleware for Next.js 16.
 *
 * Handles magic link redirects. Supabase email links (signup, recovery, email_change)
 * redirect to `/?code=xxx#type=signup`. We intercept and route to `/auth/verify`
 * which reads the hash client-side and routes appropriately.
 *
 * Note: OAuth callbacks go directly to `/auth/callback` (configured in Supabase dashboard),
 * so this only handles magic link flows.
 */
export function proxy(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl;

	// Redirect magic link auth codes from root to verify page
	// Supabase sends users to /?code=xxx#type=... even when redirectTo specifies a path
	if (pathname === '/' && searchParams.has('code')) {
		const code = searchParams.get('code');
		const url = request.nextUrl.clone();
		url.pathname = '/auth/verify';
		url.searchParams.set('code', code!);
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*$).*)',
	],
};
