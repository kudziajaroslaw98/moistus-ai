import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	try {
		// Validate Stripe secret key
		if (!process.env.STRIPE_SECRET_KEY) {
			console.error('STRIPE_SECRET_KEY is not configured');
			return NextResponse.json(
				{ error: 'Payment system configuration error' },
				{ status: 500 }
			);
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
			apiVersion: '2025-09-30.clover',
		});

		const params = await context.params;
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// IDOR Protection
		const { data: subscription, error } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('id', params.id)
			.eq('user_id', user.id) // CRITICAL: Prevent accessing other users' subscriptions
			.single();

		if (error || !subscription) {
			return NextResponse.json(
				{ error: 'Subscription not found' },
				{ status: 404 }
			);
		}

		// Cancel at period end in Stripe (don't cancel immediately)
		let stripeSubscription: Stripe.Subscription;
		try {
			stripeSubscription = await stripe.subscriptions.update(
				subscription.stripe_subscription_id,
				{
					cancel_at_period_end: true,
				}
			);

			// Verify Stripe update succeeded
			if (!stripeSubscription || !stripeSubscription.cancel_at_period_end) {
				console.error(
					'Stripe subscription update failed:',
					stripeSubscription
				);
				return NextResponse.json(
					{ error: 'Failed to cancel subscription with payment provider' },
					{ status: 500 }
				);
			}
		} catch (stripeError) {
			console.error('Stripe API error during cancellation:', stripeError);
			return NextResponse.json(
				{
					error:
						stripeError instanceof Error
							? stripeError.message
							: 'Failed to cancel subscription with payment provider',
				},
				{ status: 500 }
			);
		}

		// Update database to match Stripe state
		const { data: updatedSubscription, error: updateError } = await supabase
			.from('user_subscriptions')
			.update({
				cancel_at_period_end: true,
				updated_at: new Date().toISOString(),
			})
			.eq('id', params.id)
			.select();

		if (updateError) {
			console.error('Database update failed after Stripe cancellation:', updateError);
			// Note: Stripe has already been updated at this point.
			// The webhook should eventually sync this, but we still return an error
			return NextResponse.json(
				{ error: 'Failed to update subscription status in database' },
				{ status: 500 }
			);
		}

		// Verify rows were actually updated
		if (!updatedSubscription || updatedSubscription.length === 0) {
			console.error('No rows updated in database after Stripe cancellation');
			return NextResponse.json(
				{ error: 'Failed to update subscription status in database' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			cancelAtPeriodEnd: true,
		});
	} catch (error) {
		console.error('Unexpected error during subscription cancellation:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
