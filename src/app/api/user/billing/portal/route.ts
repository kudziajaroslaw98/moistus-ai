import { createClient } from '@/helpers/supabase/server';
import { BILLING_SETTINGS_URL } from '@/lib/billing-urls';
import { createPolarClient, getAppUrl, getPolarEnvironment } from '@/lib/polar';
import { NextResponse } from 'next/server';

/**
 * Billing portal for the signed-in user.
 *
 * `POST` answers `{ url }` and the settings panel navigates to it. The old flow pointed
 * the browser at this route and relied on a redirect to polar.sh; a service worker or
 * proxy in between could turn that into a page that doesn't exist, and a failure left
 * the user on a blank error. With JSON the panel can show what went wrong.
 * `GET` keeps redirecting for old links (the invoice route).
 */
async function createPortalUrl(): Promise<
	{ url: string } | { error: string; status: number }
> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { error: 'Unauthorized', status: 401 };
	}

	const { data: subscription } = await supabase
		.from('user_subscriptions')
		.select('polar_customer_id')
		.eq('user_id', user.id)
		.not('polar_customer_id', 'is', null)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	const polar = createPolarClient();
	const return_url = `${getAppUrl()}${BILLING_SETTINGS_URL}`;
	const storedCustomerId = subscription?.polar_customer_id;
	const attempts = [
		// The customer Polar sent us in the subscription webhook.
		...(storedCustomerId
			? [{ customer_id: storedCustomerId, return_url }]
			: []),
		// Checkout links every customer to the app user, so this also works when the
		// stored id is missing, stale or from another Polar environment.
		{ external_customer_id: user.id, return_url },
	] as const;

	for (const attempt of attempts) {
		try {
			const session = await polar.customerSessions.create(attempt);

			return { url: session.customer_portal_url };
		} catch (error) {
			// Status and name only: enough to tell a missing token scope (403), a wrong
			// environment or token (401) and an unknown customer (404/422) apart in the logs.
			console.error('[Billing portal] Could not create a customer session', {
				by: 'customer_id' in attempt ? 'customer_id' : 'external_customer_id',
				name: error instanceof Error ? error.name : 'UnknownError',
				statusCode: (error as { statusCode?: number } | null)?.statusCode,
				environment: getPolarEnvironment(),
			});
		}
	}

	// Polar doesn't know this person: the plan wasn't bought through checkout (a trial or
	// a plan set up by hand), so there is no portal to open.
	if (!storedCustomerId) {
		return {
			error:
				'There is no billing account for this plan. It was not bought through Shiko checkout (for example a trial), so there is no billing portal to open.',
			status: 404,
		};
	}

	return {
		error: 'Could not open the billing portal. Please try again.',
		status: 502,
	};
}

export async function POST() {
	const result = await createPortalUrl();

	if ('error' in result) {
		return NextResponse.json(
			{ error: result.error },
			{ status: result.status }
		);
	}

	return NextResponse.json({ url: result.url });
}

export async function GET() {
	const result = await createPortalUrl();

	if ('error' in result) {
		return NextResponse.json(
			{ error: result.error },
			{ status: result.status }
		);
	}

	return NextResponse.redirect(result.url);
}
