import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	requireSubscription,
	SubscriptionError,
} from '@/helpers/api/with-subscription-check';
import { z } from 'zod';
import { BILLING_SETTINGS_URL } from '@/lib/billing-urls';

const requestSchema = z.object({
	format: z.enum(['pdf', 'json']),
});

export const POST = withApiValidation(
	requestSchema,
	async (_req, { format }, supabase, user) => {
		try {
			await requireSubscription(user, supabase, 'pro');

			return respondSuccess({ authorized: true });
		} catch (error) {
			if (error instanceof SubscriptionError) {
				console.error(
					'[Export] Unauthorized export attempt:',
					JSON.stringify({
						userId: user.id,
						format,
						code: error.code,
						timestamp: new Date().toISOString(),
					})
				);

				return respondError(
					'Pro subscription required for this export format.',
					403,
					error.code,
					{ format, upgradeUrl: BILLING_SETTINGS_URL }
				);
			}

			throw error;
		}
	}
);
