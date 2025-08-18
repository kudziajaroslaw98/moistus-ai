import { ApiResponse } from '@/types/api-response';
import { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { createClient } from '../supabase/server';
import { respondError } from './responses';

type AuthenticatedApiHandler<TBody, TResponseData> = (
	req: Request,
	validatedBody: TBody,
	supabase: Awaited<ReturnType<typeof createClient>>,
	user: User // User is always present (anonymous or full)
) => Promise<NextResponse<ApiResponse<TResponseData>>>;

/**
 * API validation middleware that requires authentication (anonymous or full user)
 *
 * This helper ensures that:
 * 1. User is always authenticated (either anonymous via signInAnonymously or full user)
 * 2. Request body is validated against the provided Zod schema
 * 3. Supabase client and authenticated user are passed to the handler
 *
 * @param schema Zod schema for request body validation
 * @param handler API handler function that receives validated data and authenticated user
 */
export function withAuthValidation<TBody, TResponseData>(
	schema: ZodSchema<TBody>,
	handler: AuthenticatedApiHandler<TBody, TResponseData>
) {
	return async (req: Request) => {
		const supabase = await createClient();

		try {
			// Get authenticated user (anonymous or full)
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				console.error('Authentication required:', userError);
				return respondError(
					'Authentication required. Please sign in or join anonymously.',
					401,
					'User not authenticated.'
				);
			}

			// Parse and validate request body
			const body =
				req.method === 'GET' ? {} : await req.json().catch(() => ({}));
			const validationResult = schema.safeParse(body);

			if (!validationResult.success) {
				const errorMessage = validationResult.error.issues
					.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
					.join(', ');

				return respondError(errorMessage, 400, 'Invalid request body.');
			}

			// Call handler with validated data and authenticated user
			return await handler(req, validationResult.data, supabase, user);
		} catch (error) {
			console.error(`Error in API route ${req.url}:`, error);
			const message =
				error instanceof Error ? error.message : 'Internal Server Error';
			return respondError('An unexpected error occurred.', 500, message);
		}
	};
}

/**
 * Rate limiting configuration for anonymous users
 * Anonymous users have more restrictive rate limits than authenticated users
 */
export const getAnonymousRateLimit = (user: User) => {
	// Check if user is anonymous by looking at user metadata or profile
	// For now, we'll use a simple check - anonymous users typically have user.is_anonymous
	const isAnonymous = user.is_anonymous === true;

	return {
		isAnonymous,
		// Anonymous users: 10 requests per minute
		// Full users: 60 requests per minute
		maxRequests: isAnonymous ? 10 : 60,
		windowMs: 60 * 1000, // 1 minute
	};
};
