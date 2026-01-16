import { createClient } from '@/helpers/supabase/server';
import { createPolarClient } from '@/lib/polar';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const params = await context.params;
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// IDOR Protection: Verify user owns this subscription
		const { data: subscription, error } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('id', params.id)
			.eq('user_id', user.id)
			.single();

		if (error || !subscription) {
			return NextResponse.json(
				{ error: 'Subscription not found' },
				{ status: 404 }
			);
		}

		// Check if we have a Polar subscription ID
		if (!subscription.polar_subscription_id) {
			return NextResponse.json(
				{ error: 'No Polar subscription found' },
				{ status: 400 }
			);
		}

		// Reactivate subscription in Polar (uncancel)
		try {
			const polar = createPolarClient();

			await polar.subscriptions.update({
				id: subscription.polar_subscription_id,
				subscriptionUpdate: {
					cancelAtPeriodEnd: false,
				},
			});
		} catch (polarError) {
			console.error('Polar API error during reactivation:', polarError);
			return NextResponse.json(
				{
					error:
						polarError instanceof Error
							? polarError.message
							: 'Failed to reactivate subscription with payment provider',
				},
				{ status: 500 }
			);
		}

		// Update database to match Polar state
		const { data: updatedSubscription, error: updateError } = await supabase
			.from('user_subscriptions')
			.update({
				cancel_at_period_end: false,
				canceled_at: null,
				status: 'active',
				updated_at: new Date().toISOString(),
			})
			.eq('id', params.id)
			.select();

		if (updateError) {
			console.error(
				'Database update failed after Polar reactivation:',
				updateError
			);
			return NextResponse.json(
				{ error: 'Failed to update subscription status in database' },
				{ status: 500 }
			);
		}

		// Verify rows were actually updated
		if (!updatedSubscription || updatedSubscription.length === 0) {
			console.error('No rows updated in database after Polar reactivation');
			return NextResponse.json(
				{ error: 'Failed to update subscription status in database' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Unexpected error during subscription reactivation:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
