import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-10-29.clover',
});

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const invoiceId = searchParams.get('invoiceId');

		if (!invoiceId) {
			return NextResponse.json(
				{ error: 'Invoice ID required' },
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

		// IDOR Protection: Verify user owns this invoice
		// The metadata column contains { stripe_invoice_id: "inv_xxx" }
		const { data: payment, error } = await supabase
			.from('payment_history')
			.select('id')
			.eq('user_id', user.id)
			.filter('metadata->>stripe_invoice_id', 'eq', invoiceId)
			.single();

		if (error || !payment) {
			return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
		}

		// Retrieve invoice from Stripe
		const invoice = await stripe.invoices.retrieve(invoiceId);

		if (!invoice.invoice_pdf) {
			return NextResponse.json(
				{ error: 'Invoice PDF not available' },
				{ status: 404 }
			);
		}

		return NextResponse.json({ url: invoice.invoice_pdf });
	} catch (error) {
		console.error('Invoice fetch error:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch invoice' },
			{ status: 500 }
		);
	}
}
