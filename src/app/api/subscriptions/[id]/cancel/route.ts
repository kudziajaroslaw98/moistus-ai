import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { createDodoClient } from '@/helpers/dodo/client';
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

		// IDOR Protection: Verify user owns this subscription
		const { data: subscription, error } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('id', subscriptionId)
			.eq('user_id', user.id)
			.single();

		if (error || !subscription) {
			return respondError('Subscription not found', 404);
		}

		// Check if we have a Dodo subscription ID
		if (!subscription.dodo_subscription_id) {
			return respondError('No Dodo subscription found', 400);
		}

		// Cancel at period end in Dodo
		try {
			const dodo = createDodoClient();

			await dodo.subscriptions.update(subscription.dodo_subscription_id, {
				status: 'cancelled',
			});
		} catch (dodoError) {
			console.error('Dodo API error during cancellation:', dodoError);
			return respondError(
				dodoError instanceof Error
					? dodoError.message
					: 'Failed to cancel subscription with payment provider',
				500
			);
		}

		// Update database to reflect cancellation
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
				'Database update failed after Dodo cancellation:',
				updateError
			);
			// Note: Dodo has already been updated at this point.
			// The webhook should eventually sync this, but we still return an error
			return respondError(
				'Failed to update subscription status in database',
				500
			);
		}

		// Verify rows were actually updated
		if (!updatedSubscription || updatedSubscription.length === 0) {
			console.error('No rows updated in database after Dodo cancellation');
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
