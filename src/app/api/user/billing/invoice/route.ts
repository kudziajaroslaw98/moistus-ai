import { NextResponse } from 'next/server';

/**
 * Invoice route - redirects to Polar billing portal.
 *
 * With Polar as MoR, all invoices and billing history are managed
 * through their customer portal. This route simply redirects users there.
 */
export async function GET() {
	// All invoice requests redirect to the billing portal
	return NextResponse.redirect(
		new URL('/api/user/billing/portal', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
	);
}
