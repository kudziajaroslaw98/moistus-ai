import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withPublicApiValidation } from '@/helpers/api/with-public-api-validation';
import { checkRateLimit, getClientIP } from '@/helpers/api/rate-limiter';
import { waitlistFormSchema, type WaitlistFormData } from '@/lib/validations/waitlist';

export const POST = withPublicApiValidation(
	waitlistFormSchema,
	async (req, validatedBody, supabase) => {
		try {
			const { email } = validatedBody;

			// Check rate limiting first
			const rateLimitResult = checkRateLimit(req);
			if (!rateLimitResult.allowed) {
				const resetTime = new Date(rateLimitResult.resetTime);
				return respondError(
					`Too many requests. Please try again after ${resetTime.toLocaleTimeString()}.`,
					429,
					'Rate limit exceeded'
				);
			}

			// Get client information for logging
			const clientIP = getClientIP(req);
			const userAgent = req.headers.get('user-agent') || '';
			const referrer = req.headers.get('referer') || '';

			// Check if email already exists
			const { data: existingSubmission, error: checkError } = await supabase
				.from('waitlist_submissions')
				.select('id, email, created_at')
				.eq('email', email)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				// PGRST116 is "not found" error, which is expected for new emails
				console.error('Error checking existing email:', checkError);
				return respondError(
					'Failed to process request. Please try again.',
					500,
					'Database error'
				);
			}

			if (existingSubmission) {
				// Email already exists
				return respondError(
					"You're already on the waitlist! We'll notify you when we launch.",
					409,
					'Email already registered'
				);
			}

			// Insert new waitlist submission
			const { data: newSubmission, error: insertError } = await supabase
				.from('waitlist_submissions')
				.insert([
					{
						email,
						ip_address: clientIP,
						user_agent: userAgent,
						referrer: referrer || null,
						metadata: {
							timestamp: new Date().toISOString(),
							headers: {
								'user-agent': userAgent,
								'referer': referrer,
							},
						},
					},
				])
				.select('id, email, created_at')
				.single();

			if (insertError) {
				console.error('Error inserting waitlist submission:', insertError);

				// Handle unique constraint violation (race condition)
				if (insertError.code === '23505') {
					return respondError(
						"You're already on the waitlist! We'll notify you when we launch.",
						409,
						'Email already registered'
					);
				}

				return respondError(
					'Failed to join waitlist. Please try again.',
					500,
					'Database error'
				);
			}

			// Success response
			return respondSuccess(
				{
					success: true,
					message: "Welcome to the waitlist! We'll notify you when we launch.",
					email: newSubmission.email,
					joinedAt: newSubmission.created_at,
				},
				201,
				'Successfully joined waitlist'
			);
		} catch (error) {
			console.error('Error in POST /api/waitlist:', error);
			return respondError(
				'An unexpected error occurred. Please try again.',
				500,
				'Internal server error'
			);
		}
	}
);

// Handle other HTTP methods
export async function GET() {
	return respondError('Method not allowed', 405, 'GET method not supported');
}

export async function PUT() {
	return respondError('Method not allowed', 405, 'PUT method not supported');
}

export async function DELETE() {
	return respondError('Method not allowed', 405, 'DELETE method not supported');
}
