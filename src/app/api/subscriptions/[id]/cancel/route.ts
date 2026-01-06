import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import Stripe from 'stripe';
import { z } from 'zod';

// No body expected for this route
const cancelSubscriptionSchema = z.object({});

export const POST = withAuthValidation(
	cancelSubscriptionSchema,
	async (req, _data, supabase, user) => {
		// Extract subscription ID from URL path
		const url = new URL(req.url);
		const pathParts = url.pathname.split('/');
		const subscriptionId = pathParts[pathParts.indexOf('subscriptions') + 1];

		if (!subscriptionId) {
			return respondError('Subscription ID is required', 400);
		}

		// Validate Stripe secret key
		if (!process.env.STRIPE_SECRET_KEY) {
			console.error('STRIPE_SECRET_KEY is not configured');
			return respondError('Payment system configuration error', 500);
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
			apiVersion: '2025-12-15.clover',
		});

		// IDOR Protection
		const { data: subscription, error } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('id', subscriptionId)
			.eq('user_id', user.id) // CRITICAL: Prevent accessing other users' subscriptions
			.single();

		if (error || !subscription) {
			return respondError('Subscription not found', 404);
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
				console.error('Stripe subscription update failed:', stripeSubscription);
				return respondError(
					'Failed to cancel subscription with payment provider',
					500
				);
			}
		} catch (stripeError) {
			console.error('Stripe API error during cancellation:', stripeError);
			return respondError(
				stripeError instanceof Error
					? stripeError.message
					: 'Failed to cancel subscription with payment provider',
				500
			);
		}

		// Update database to match Stripe state
		const { data: updatedSubscription, error: updateError } = await supabase
			.from('user_subscriptions')
			.update({
				cancel_at_period_end: true,
				updated_at: new Date().toISOString(),
			})
			.eq('id', subscriptionId)
			.select();

		if (updateError) {
			console.error(
				'Database update failed after Stripe cancellation:',
				updateError
			);
			// Note: Stripe has already been updated at this point.
			// The webhook should eventually sync this, but we still return an error
			return respondError(
				'Failed to update subscription status in database',
				500
			);
		}

		// Verify rows were actually updated
		if (!updatedSubscription || updatedSubscription.length === 0) {
			console.error('No rows updated in database after Stripe cancellation');
			return respondError(
				'Failed to update subscription status in database',
				500
			);
		}

		return respondSuccess({
			cancelAtPeriodEnd: true,
		});
	}
);
