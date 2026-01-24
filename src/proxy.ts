import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy middleware for Next.js 16.
 *
 * Handles password recovery redirects. Supabase strips the path from redirectTo,
 * so we intercept `/?code=xxx` at the root and redirect to `/auth/forgot-password?code=xxx`.
 * The PKCE code verifier in localStorage is preserved across same-origin redirects.
 */
export function proxy(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl;

	// Redirect password recovery codes from root to forgot-password page
	// Supabase sends users to /?code=xxx even when redirectTo specifies a path
	if (pathname === '/' && searchParams.has('code')) {
		const code = searchParams.get('code');
		const url = request.nextUrl.clone();
		url.pathname = '/auth/forgot-password';
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
