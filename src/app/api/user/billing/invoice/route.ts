import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Invoice route - redirects to Polar billing portal.
 *
 * With Polar as MoR, all invoices and billing history are managed
 * through their customer portal. This route simply redirects users there.
 */
export async function GET() {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	// All invoice requests redirect to the billing portal
	return NextResponse.redirect(
		new URL('/api/user/billing/portal', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
	);
}
