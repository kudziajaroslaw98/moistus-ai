'use server';

import { createClient } from '@/helpers/supabase/server';

export type ConsentDecisionResult =
	| { ok: true; redirectUrl: string }
	| { ok: false; message: string };

/**
 * Approves or denies an AI app's request. Either way Supabase returns the
 * URL to send the browser back to: with a code on approval, with
 * `error=access_denied` on denial, so the app stops waiting.
 */
export async function decideAuthorization(
	authorizationId: string,
	decision: 'approve' | 'deny'
): Promise<ConsentDecisionResult> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user || user.is_anonymous) {
		return { ok: false, message: 'Your session ended. Sign in again, then retry from your AI app.' };
	}

	const { data, error } =
		decision === 'approve'
			? await supabase.auth.oauth.approveAuthorization(authorizationId, {
					skipBrowserRedirect: true,
				})
			: await supabase.auth.oauth.denyAuthorization(authorizationId, {
					skipBrowserRedirect: true,
				});

	if (error || !data?.redirect_url) {
		return {
			ok: false,
			message: 'This request expired or was already used. Start connecting again from your AI app.',
		};
	}
	return { ok: true, redirectUrl: data.redirect_url };
}
