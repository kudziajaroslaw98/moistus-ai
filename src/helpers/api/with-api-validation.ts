import { ApiResponse } from '@/types/api-response';
import { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { createClient } from '../supabase/server';
import { respondError } from './responses';

type ApiHandler<TBody, TResponseData, TParams = Record<string, never>> = (
	req: Request,
	validatedBody: TBody,
	supabase: Awaited<ReturnType<typeof createClient>>, // Pass Supabase client
	user: User,
	params?: TParams
) => Promise<NextResponse<ApiResponse<TResponseData>> | Response>;

export function withApiValidation<
	TBody,
	TResponseData,
	TParams = Record<string, never>,
>(schema: ZodSchema<TBody>, handler: ApiHandler<TBody, TResponseData, TParams>) {
	return async (
		req: Request,
		context: { params: Promise<TParams> | TParams } = {
			params: {} as TParams,
		}
	) => {
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

			// Await params if it's a Promise (Next.js 16)
			const resolvedParams = context?.params
				? context.params instanceof Promise
					? await context.params
					: context.params
				: undefined;

			return await handler(
				req,
				validationResult.data,
				supabase,
				user,
				resolvedParams
			);
		} catch (error) {
			console.error('Error in API route %s:', req.url, error);
			const message =
				error instanceof Error ? error.message : 'Internal Server Error';
			return respondError('Internal server error.', 500, message);
		}
	};
}
