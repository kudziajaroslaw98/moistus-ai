/**
 * Mailpit Email Client for E2E Testing
 *
 * Supabase local development uses Mailpit as an email testing server.
 * API available at http://localhost:54324/api/v1/
 *
 * This client fetches OTP codes from verification emails.
 */

const MAILPIT_URL = process.env.INBUCKET_URL || 'http://localhost:54324';

interface MailpitMessage {
	ID: string;
	MessageID: string;
	From: {
		Name: string;
		Address: string;
	};
	To: Array<{
		Name: string;
		Address: string;
	}>;
	Subject: string;
	Date: string;
	Size: number;
	Read: boolean;
}

interface MailpitMessagesResponse {
	total: number;
	unread: number;
	count: number;
	messages_count: number;
	start: number;
	tags: string[];
	messages: MailpitMessage[];
}

interface MailpitMessageDetail {
	ID: string;
	MessageID: string;
	From: {
		Name: string;
		Address: string;
	};
	To: Array<{
		Name: string;
		Address: string;
	}>;
	Subject: string;
	Date: string;
	Text: string;
	HTML: string;
}

/**
 * Lists all messages in Mailpit, optionally filtered by recipient.
 */
export async function listMessages(email?: string): Promise<MailpitMessage[]> {
	const response = await fetch(`${MAILPIT_URL}/api/v1/messages`);

	if (!response.ok) {
		throw new Error(`Failed to list messages: ${response.statusText}`);
	}

	const data: MailpitMessagesResponse = await response.json();

	// Filter by recipient email if provided
	if (email) {
		return data.messages.filter((msg) =>
			msg.To.some((to) => to.Address.toLowerCase() === email.toLowerCase())
		);
	}

	return data.messages;
}

/**
 * Gets the full details of a specific message including body.
 */
export async function getMessageBody(
	_email: string,
	messageId: string
): Promise<{ text: string; html: string }> {
	const response = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`);

	if (!response.ok) {
		throw new Error(`Failed to get message body: ${response.statusText}`);
	}

	const data: MailpitMessageDetail = await response.json();
	return { text: data.Text, html: data.HTML };
}

/**
 * Deletes a specific message.
 */
export async function deleteMessage(
	_email: string,
	messageId: string
): Promise<void> {
	const response = await fetch(`${MAILPIT_URL}/api/v1/messages`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ids: [messageId] }),
	});

	if (!response.ok) {
		throw new Error(`Failed to delete message: ${response.statusText}`);
	}
}

/**
 * Clears all messages in Mailpit.
 */
export async function clearMailbox(_email?: string): Promise<void> {
	const response = await fetch(`${MAILPIT_URL}/api/v1/messages`, {
		method: 'DELETE',
	});

	// 200 or 204 are both fine
	if (!response.ok && response.status !== 204) {
		throw new Error(`Failed to clear mailbox: ${response.statusText}`);
	}
}

/**
 * Extracts a 6-digit OTP code from email body text.
 */
function extractOtpFromBody(body: string): string | null {
	// Supabase verification emails typically contain the OTP in various formats
	// Match 6-digit codes with different contexts
	const patterns = [
		/verification code[:\s]+(\d{6})/i, // "verification code: 123456"
		/your code[:\s]+(\d{6})/i, // "your code is 123456"
		/code[:\s]+(\d{6})/i, // "code: 123456"
		/OTP[:\s]+(\d{6})/i, // "OTP: 123456"
		/token[:\s]+(\d{6})/i, // "token: 123456"
		/\b(\d{6})\b/, // Plain 6 digits as fallback
	];

	for (const pattern of patterns) {
		const match = body.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	return null;
}

/**
 * Waits for and retrieves the OTP code from the most recent verification email.
 *
 * @param email - Email address to check
 * @param timeout - Maximum time to wait for email (default: 30s)
 * @param pollInterval - Time between checks (default: 1s)
 * @returns The 6-digit OTP code
 */
export async function waitForOtp(
	email: string,
	timeout = 30000,
	pollInterval = 1000
): Promise<string> {
	const startTime = Date.now();
	let lastError: Error | null = null;
	let messageCount = 0;

	console.log(`Waiting for OTP email at: ${email}`);

	while (Date.now() - startTime < timeout) {
		try {
			const messages = await listMessages(email);
			messageCount = messages.length;

			// Get the most recent message
			if (messages.length > 0) {
				// Sort by date descending
				const sortedMessages = messages.sort(
					(a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()
				);

				const latestMessage = sortedMessages[0];

				// Check if it's a verification email (Supabase email subjects)
				const subject = latestMessage.Subject.toLowerCase();
				if (
					subject.includes('verification') ||
					subject.includes('confirm') ||
					subject.includes('code') ||
					subject.includes('email change') ||
					subject.includes('otp')
				) {
					const body = await getMessageBody(email, latestMessage.ID);
					const otp = extractOtpFromBody(body.text || body.html);

					if (otp) {
						console.log(`Found OTP: ${otp}`);
						// Delete the message after reading to avoid reuse
						await deleteMessage(email, latestMessage.ID);
						return otp;
					}
				}
			}
		} catch (error) {
			// Store error but continue polling
			lastError = error instanceof Error ? error : new Error(String(error));
		}

		await new Promise((resolve) => setTimeout(resolve, pollInterval));
	}

	throw new Error(
		`Timed out waiting for OTP email for ${email}. Messages found: ${messageCount}. Last error: ${lastError?.message || 'none'}`
	);
}

/**
 * Generates a unique test email address.
 * Uses a timestamp to ensure uniqueness across test runs.
 */
export function generateTestEmail(prefix = 'test'): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `${prefix}-${timestamp}-${random}@test.local`;
}

/**
 * Gets all messages for debugging purposes.
 */
export async function debugListAllMessages(email?: string): Promise<{
	messages: MailpitMessage[];
	bodies: Array<{ text: string; html: string }>;
}> {
	const messages = await listMessages(email);
	const bodies: Array<{ text: string; html: string }> = [];

	for (const msg of messages) {
		const body = await getMessageBody(email || '', msg.ID);
		bodies.push(body);
	}

	return { messages, bodies };
}

/**
 * Searches for messages matching a query.
 */
export async function searchMessages(query: string): Promise<MailpitMessage[]> {
	const response = await fetch(
		`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(query)}`
	);

	if (!response.ok) {
		throw new Error(`Failed to search messages: ${response.statusText}`);
	}

	const data: MailpitMessagesResponse = await response.json();
	return data.messages;
}
