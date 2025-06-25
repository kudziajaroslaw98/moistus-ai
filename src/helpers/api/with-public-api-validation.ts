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
			const body =
				req.method === 'GET' ? {} : await req.json().catch(() => ({}));
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
