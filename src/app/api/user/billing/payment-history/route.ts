import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		const supabase = await createClient();

		// Get the current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Fetch payment history for this user
		const { data: payments, error: paymentsError } = await supabase
			.from('payment_history')
			.select('*')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(50); // Last 50 payments

		if (paymentsError) {
			console.error('Error fetching payment history:', paymentsError);
			return NextResponse.json(
				{ error: 'Failed to fetch payment history' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			data: payments || [],
		});
	} catch (error) {
		console.error('Error in payment-history GET:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
