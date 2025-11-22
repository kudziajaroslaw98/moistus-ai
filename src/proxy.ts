import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from './helpers/supabase/server';

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value)
					);
					supabaseResponse = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (
		!user &&
		!request.nextUrl.pathname.startsWith('/login') &&
		!request.nextUrl.pathname.startsWith('/auth')
	) {
		const url = request.nextUrl.clone();
		url.pathname = '/login';
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}

const checkIfAuthenticated = async (req: NextRequest) => {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (user === null || error !== null) {
		const redirectUrl = req.nextUrl.clone();
		redirectUrl.pathname = '/auth/sign-in';
		redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname);

		return NextResponse.redirect(new URL(redirectUrl));
	}
};

export async function proxy(req: NextRequest) {
	await updateSession(req);

	const protectedRoutes = ['/dashboard', '/mind-map'];

	if (protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))) {
		return checkIfAuthenticated(req);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
