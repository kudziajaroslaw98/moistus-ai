// src/app/api/nodes/search-across-maps/route.ts

import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { z } from 'zod';

const searchSchema = z.object({
	query: z.string().min(2, 'Search query must be at least 2 characters'),
});

export const POST = withApiValidation(
	searchSchema,
	async (req, validatedBody, supabase, user) => {
		try {
			const { query } = validatedBody;

			const { data, error } = await supabase.rpc('search_accessible_nodes', {
				p_user_id: user.id,
				p_search_query: query,
			});

			if (error) {
				console.error('Error searching accessible nodes:', error);
				return respondError('Failed to search nodes.', 500, error.message);
			}

			return respondSuccess(data || []);
		} catch (error) {
			console.error('API Error in search-across-maps:', error);
			return respondError('An internal error occurred during search.', 500);
		}
	}
);
