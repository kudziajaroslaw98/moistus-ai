import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Invoice route for Dodo Payments.
 *
 * With Dodo as MOR, invoices are managed through their customer portal.
 * This route provides invoice URLs from payment_history metadata where available.
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const paymentId = searchParams.get('paymentId');

		if (!paymentId) {
			return NextResponse.json(
				{ error: 'Payment ID required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// IDOR Protection: Verify user owns this payment record
		const { data: payment, error } = await supabase
			.from('payment_history')
			.select('id, dodo_payment_id, metadata')
			.eq('user_id', user.id)
			.eq('dodo_payment_id', paymentId)
			.single();

		if (error || !payment) {
			return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
		}

		// Dodo invoices are accessed through customer portal
		// Direct invoice URLs may be available in payment metadata if configured
		const invoiceUrl = (payment.metadata as Record<string, unknown>)?.invoice_url;

		if (invoiceUrl && typeof invoiceUrl === 'string') {
			return NextResponse.json({ url: invoiceUrl });
		}

		// If no direct invoice URL, redirect to customer portal
		return NextResponse.json(
			{
				error: 'Invoice available through billing portal',
				redirectToPortal: true
			},
			{ status: 404 }
		);
	} catch (error) {
		console.error('Invoice fetch error:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch invoice' },
			{ status: 500 }
		);
	}
}
