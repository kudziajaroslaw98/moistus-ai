import { ApiResponse } from '@/types/api-response';
import { NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { createClient } from '../supabase/server';
import { respondError } from './responses';

type PublicApiHandler<TBody, TResponseData> = (
	req: Request,
	validatedBody: TBody,
	supabase: Awaited<ReturnType<typeof createClient>>
) => Promise<NextResponse<ApiResponse<TResponseData>>>;

export function withPublicApiValidation<TBody, TResponseData>(
	schema: ZodSchema<TBody>,
	handler: PublicApiHandler<TBody, TResponseData>
) {
	return async (req: Request) => {
		const supabase = await createClient();

		try {
			let body = {};

			// Only attempt to parse body for non-GET requests
			if (req.method !== 'GET') {
				const contentType =
					req.headers.get('content-type')?.toLowerCase() || '';

				// Only parse JSON if Content-Type indicates JSON
				if (contentType.includes('application/json')) {
					try {
						body = await req.json();
					} catch (jsonError) {
						console.warn(
							`Failed to parse JSON body for ${req.method} ${req.url}:`,
							jsonError instanceof Error ? jsonError.message : 'Unknown error'
						);
						// If JSON parsing fails, keep body as empty object
						body = {};
					}
				} else if (contentType.includes('application/x-www-form-urlencoded')) {
					// Handle form data by converting to object
					try {
						const formData = await req.formData();
						body = Object.fromEntries(formData.entries());
					} catch (formError) {
						console.warn(
							`Failed to parse form data for ${req.method} ${req.url}:`,
							formError instanceof Error ? formError.message : 'Unknown error'
						);
						body = {};
					}
				}
				// For other content types (multipart/form-data, text/plain, etc.),
				// body remains empty object as they require special handling
			}
			const validationResult = schema.safeParse(body);

			if (!validationResult.success) {
				return respondError(
					validationResult.error.issues
						.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
						.join(', '),
					400,
					'Invalid request body.'
				);
			}

			return await handler(req, validationResult.data, supabase);
		} catch (error) {
			console.error(`Error in public API route ${req.url}:`, error);
			const message =
				error instanceof Error ? error.message : 'Internal Server Error';
			return respondError('Internal server error.', 500, message);
		}
	};
}
