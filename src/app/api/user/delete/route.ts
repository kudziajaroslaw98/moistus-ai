import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { sendAccountDeletionEmail } from '@/lib/email';
import { createPolarClient } from '@/lib/polar';
import { z } from 'zod';

const deleteAccountSchema = z.object({
	confirmEmail: z.string().email('Please provide a valid email address'),
});

/**
 * DELETE /api/user/delete
 *
 * Permanently deletes a user account and all associated data.
 * GDPR Article 17 - Right to Erasure compliance.
 *
 * What the person added to OTHER people's maps (nodes, connections, comment
 * threads and replies, history entries) stays, handed to the "Former member"
 * placeholder by `reassign_contributions`; deleting the auth user would
 * otherwise cascade it away. Their own maps are deleted.
 *
 * Deletion order (FK-safe):
 * 1. Hand contributions on other people's maps to Former member (aborts if it fails)
 * 2. Cancel Polar subscription (immediate revoke)
 * 3. Delete what is left of the user's comments/reactions (on their own maps)
 * 4. Delete activity logs and usage data
 * 5. Delete billing records
 * 6. Delete user's owned maps (CASCADE handles nodes, edges, etc.)
 * 7. Delete user profile
 * 8. Delete auth user
 * 9. Send confirmation email
 */
export const DELETE = withAuthValidation(
	deleteAccountSchema,
	async (_req, { confirmEmail }, supabase, user) => {
		// 1. Validate email matches user's email
		if (confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
			return respondError(
				'Email does not match your account email',
				400,
				'Email mismatch'
			);
		}

		// Prevent anonymous users from deleting (they should upgrade first)
		if (user.is_anonymous) {
			return respondError(
				'Anonymous users cannot delete their account. Please sign up first.',
				403,
				'Anonymous user'
			);
		}

		// Get service role client to bypass RLS for complete deletion
		const adminClient = createServiceRoleClient();

		// Store user info for confirmation email (before deletion)
		const { data: userProfile } = await supabase
			.from('user_profiles')
			.select('full_name, display_name, email')
			.eq('user_id', user.id)
			.single();

		const displayName =
			userProfile?.display_name || userProfile?.full_name || null;
		const userEmail = userProfile?.email || user.email;

		// 2. Keep what they added to other people's maps. This runs before anything
		// is cancelled or deleted: it only changes who those rows belong to, can be
		// repeated, and if it fails the account is still whole and can retry.
		const { error: reassignError } = await adminClient.rpc(
			'reassign_contributions',
			{ p_from: user.id }
		);

		if (reassignError) {
			console.error(
				'[AccountDeletion] Failed to hand contributions to Former member:',
				reassignError
			);
			return respondError(
				'Failed to delete your account. Nothing was deleted, please try again or contact support.',
				500,
				'Reassign failed'
			);
		}

		// 3. Check for and cancel active Polar subscription
		const { data: subscription } = await supabase
			.from('user_subscriptions')
			.select('polar_subscription_id, status')
			.eq('user_id', user.id)
			.in('status', ['active', 'trialing'])
			.single();

		if (subscription?.polar_subscription_id) {
			try {
				const polar = createPolarClient();
				// Immediately revoke subscription (not cancelAtPeriodEnd)
				await polar.subscriptions.revoke(subscription.polar_subscription_id);
				console.log(
					`[AccountDeletion] Revoked Polar subscription: ${subscription.polar_subscription_id}`
				);
			} catch (polarError) {
				// Log but continue - subscription will expire naturally
				// User data deletion is more important than subscription cleanup
				console.error(
					'[AccountDeletion] Polar revocation failed (continuing):',
					polarError
				);
			}
		}

		// 4. Delete user data in FK-safe order
		// Using best-effort deletion - continue on errors, log for manual cleanup
		const deletionResults: Array<{ table: string; error?: string }> = [];

		const deleteFromTable = async (
			table: string,
			column: string = 'user_id'
		) => {
			const { error } = await adminClient
				.from(table)
				.delete()
				.eq(column, user.id);

			if (error) {
				console.error(`[AccountDeletion] Failed to delete from ${table}:`, error);
				deletionResults.push({ table, error: error.message });
			} else {
				deletionResults.push({ table });
			}
		};

		// Phase 1: Comments & reactions. Their content on other people's maps was
		// handed to Former member above, so what is left is on maps they own
		// (deleted below) and these deletes only clear what would block them
		await deleteFromTable('comment_reactions');
		await deleteFromTable('comment_messages');
		await deleteFromTable('comments', 'created_by');

		// Phase 2: Share access (user's access to other maps)
		await deleteFromTable('share_access');
		await deleteFromTable('node_references');

		// Phase 3: Activity logs
		await deleteFromTable('profile_activity_log');
		await deleteFromTable('map_history_events');
		await deleteFromTable('map_history_snapshots');

		// Phase 4: Billing & quotas
		await deleteFromTable('user_usage_quotas');
		await deleteFromTable('payment_history');
		await deleteFromTable('user_subscriptions');
		await deleteFromTable('user_preferences');

		// Phase 5: User's owned content
		// share_tokens created by user
		await deleteFromTable('share_tokens', 'created_by');
		// map_folders owned by user
		await deleteFromTable('map_folders');
		// AI recipes owned by user (copies others made keep working: source_recipe_id is set null)
		await deleteFromTable('ai_recipes');
		// mind_maps owned by user (CASCADE handles: nodes, edges, map_history_current)
		await deleteFromTable('mind_maps');

		// Phase 6: Templates - set created_by to NULL instead of deleting
		const { error: templateError } = await adminClient
			.from('map_templates')
			.update({ created_by: null })
			.eq('created_by', user.id);

		if (templateError) {
			console.error(
				'[AccountDeletion] Failed to nullify template created_by:',
				templateError
			);
			deletionResults.push({
				table: 'map_templates',
				error: templateError.message,
			});
		} else {
			deletionResults.push({ table: 'map_templates (nullified)' });
		}

		// Phase 7: User profile
		await deleteFromTable('user_profiles');

		// Phase 8: Delete auth user (MUST be last)
		const { error: authDeleteError } =
			await adminClient.auth.admin.deleteUser(user.id);

		if (authDeleteError) {
			console.error(
				'[AccountDeletion] Auth user deletion failed:',
				authDeleteError
			);
			// This is critical - if auth deletion fails, user can still log in
			// Return error so user can retry
			return respondError(
				'Failed to complete account deletion. Please try again or contact support.',
				500,
				'Auth deletion failed'
			);
		}

		console.log(`[AccountDeletion] Successfully deleted auth user: ${user.id}`);

		// Phase 9: Send confirmation email (don't block on failure)
		if (userEmail) {
			const emailResult = await sendAccountDeletionEmail(userEmail, displayName);
			if (!emailResult.success) {
				console.error(
					'[AccountDeletion] Confirmation email failed:',
					emailResult.error
				);
				// Don't return error - account is already deleted
			}
		}

		// Log deletion summary
		const failedDeletions = deletionResults.filter((r) => r.error);
		if (failedDeletions.length > 0) {
			console.warn(
				'[AccountDeletion] Some deletions failed (best-effort):',
				failedDeletions
			);
		}

		console.log(`[AccountDeletion] Account deletion complete for user: ${user.id}`);

		return respondSuccess({
			deleted: true,
			message: 'Your account has been permanently deleted.',
		});
	}
);
