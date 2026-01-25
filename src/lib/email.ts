import { Resend } from 'resend';

/**
 * Creates a Resend client instance for sending transactional emails.
 * @throws Error if RESEND_API_KEY is not configured
 */
export function createResendClient(): Resend {
	const apiKey = process.env.RESEND_API_KEY;

	if (!apiKey) {
		throw new Error('RESEND_API_KEY is not configured');
	}

	return new Resend(apiKey);
}

/**
 * Sends an account deletion confirmation email.
 * This is sent after the account has been successfully deleted.
 */
export async function sendAccountDeletionEmail(
	email: string,
	displayName: string | null
): Promise<{ success: boolean; error?: string }> {
	try {
		const resend = createResendClient();

		// Dev override: redirect emails to test address
		const recipientEmail = process.env.DEV_EMAIL_OVERRIDE || email;

		const { error } = await resend.emails.send({
			from: 'Shiko <noreply@shiko.app>',
			to: recipientEmail,
			subject: 'Your Shiko account has been deleted',
			text: `Hi ${displayName || 'there'},

Your Shiko account has been successfully deleted as requested.

What was deleted:
- Your user profile and preferences
- All mind maps you created
- All nodes, connections, and comments
- Your subscription (if any was active)
- All usage data and activity logs

If you didn't request this deletion, please contact us immediately at support@shiko.app.

Thank you for using Shiko. We're sorry to see you go.

Best regards,
The Shiko Team`,
		});

		if (error) {
			console.error('[Email] Failed to send deletion confirmation:', error);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (err) {
		console.error('[Email] Error sending deletion email:', err);
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error',
		};
	}
}
