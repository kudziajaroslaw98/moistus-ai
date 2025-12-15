import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /auth/callback
 *
 * Handles OAuth callback after linkIdentity() or signInWithOAuth().
 *
 * For anonymous user upgrade via OAuth:
 * 1. Exchanges code for session
 * 2. Checks if user was previously anonymous
 * 3. Updates user_profiles if upgrading from anonymous
 * 4. Redirects to appropriate page
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get('code');
	const nextParam = requestUrl.searchParams.get('next') ?? '/dashboard';

	// Validate redirect URL to prevent open redirect attacks
	// Only allow relative paths (starting with /) but not protocol-relative URLs (//)
	const isValidRedirect = nextParam.startsWith('/') && !nextParam.startsWith('//');
	const next = isValidRedirect ? nextParam : '/dashboard';
	const error = requestUrl.searchParams.get('error');
	const errorDescription = requestUrl.searchParams.get('error_description');

	// Handle OAuth errors
	if (error) {
		console.error('OAuth callback error:', error, errorDescription);
		const errorUrl = new URL('/auth/error', requestUrl.origin);
		errorUrl.searchParams.set('error', error);
		if (errorDescription) {
			errorUrl.searchParams.set('message', errorDescription);
		}
		return NextResponse.redirect(errorUrl);
	}

	if (code) {
		const supabase = await createClient();

		// Exchange the code for a session
		const { data: sessionData, error: exchangeError } =
			await supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			console.error('Failed to exchange code for session:', exchangeError);
			const errorUrl = new URL('/auth/error', requestUrl.origin);
			errorUrl.searchParams.set('error', 'session_exchange_failed');
			errorUrl.searchParams.set('message', exchangeError.message);
			return NextResponse.redirect(errorUrl);
		}

		if (sessionData?.user) {
			const user = sessionData.user;

			// Check if this user was anonymous and is being upgraded
			// After linkIdentity, the user will have:
			// - is_anonymous: false in auth.users
			// - But user_profiles might still have is_anonymous: true

			try {
				// Get current profile state
				const { data: profile, error: profileError } = await supabase
					.from('user_profiles')
					.select('is_anonymous, display_name')
					.eq('user_id', user.id)
					.single();

				if (!profileError && profile?.is_anonymous) {
					// User was anonymous - upgrade the profile
					console.log(
						'Upgrading anonymous user profile after OAuth:',
						user.id
					);

					// Get email from the OAuth identity
					const email = user.email || user.identities?.[0]?.identity_data?.email;
					const fullName =
						user.user_metadata?.full_name ||
						user.user_metadata?.name ||
						profile.display_name;

					// Call the upgrade RPC
					const { error: upgradeError } = await supabase.rpc(
						'upgrade_anonymous_to_full_user',
						{
							user_id_param: user.id,
							email_param: email,
							full_name_param: fullName,
						}
					);

					if (upgradeError) {
						console.error(
							'Failed to upgrade anonymous profile:',
							upgradeError
						);
						// Continue anyway - auth is upgraded, profile will eventually sync
					} else {
						console.log('Successfully upgraded anonymous user via OAuth');
					}

					// Redirect with upgrade success flag
					const successUrl = new URL(next, requestUrl.origin);
					successUrl.searchParams.set('upgraded', 'true');
					return NextResponse.redirect(successUrl);
				}
			} catch (err) {
				console.error('Error checking/upgrading anonymous user:', err);
				// Continue with normal redirect
			}
		}

		// Normal redirect (not an anonymous upgrade)
		return NextResponse.redirect(new URL(next, requestUrl.origin));
	}

	// No code provided - redirect to sign in
	return NextResponse.redirect(new URL('/auth/sign-in', requestUrl.origin));
}
