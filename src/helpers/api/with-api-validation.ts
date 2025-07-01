import { ApiResponse } from '@/types/api-response';
import { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { createClient } from '../supabase/server';
import { respondError } from './responses';

type ApiHandler<TBody, TResponseData> = (
	req: Request,
	validatedBody: TBody,
	supabase: Awaited<ReturnType<typeof createClient>>, // Pass Supabase client
	user: User
) => Promise<NextResponse<ApiResponse<TResponseData>> | Response>;

export function withApiValidation<TBody, TResponseData>(
	schema: ZodSchema<TBody>,
	handler: ApiHandler<TBody, TResponseData>
) {
	return async (req: Request) => {
		const supabase = await createClient(); // Or pass instance if needed elsewhere

		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				console.error('User not authenticated:', userError);
				return respondError(
					'User not authenticated.',
					401,
					'User not authenticated.'
				);
			}

			const body =
				req.method === 'GET' ? {} : await req.json().catch(() => ({}));
			const validationResult = schema.safeParse(body);

			if (!validationResult.success) {
				return respondError(
					validationResult.error.issues.join(', '),
					400,
					'Invalid request body.'
				);
			}

			return await handler(req, validationResult.data, supabase, user);
		} catch (error) {
			console.error(`Error in API route ${req.url}:`, error);
			const message =
				error instanceof Error ? error.message : 'Internal Server Error';
			return respondError('Internal server error.', 500, message);
		}
	};
}
