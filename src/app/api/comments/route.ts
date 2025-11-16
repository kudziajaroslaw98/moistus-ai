import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

/**
 * GET /api/comments
 * Fetch all comments for a specific map
 */
export const GET = withAuthValidation(
	z.object({
		map_id: z.string().uuid().optional(),
	}),
	async (req, _validatedBody, supabase, user) => {
		try {
			const { searchParams } = new URL(req.url);
			const mapId = searchParams.get('map_id');

			if (!mapId) {
				return respondError(
					'map_id query parameter is required',
					400,
					'Missing map_id parameter'
				);
			}

			// Verify user has access to the map (owner or active share access)
			const { data: map, error: mapError } = await supabase
				.from('mind_maps')
				.select('id, user_id')
				.eq('id', mapId)
				.single();

			if (mapError || !map) {
				return respondError(
					'Map not found.',
					404,
					'Map not found.'
				);
			}

			// Check if user has share access
			const { data: share } = await supabase
				.from('share_access')
				.select('id')
				.eq('map_id', mapId)
				.eq('user_id', user.id)
				.eq('status', 'active')
				.limit(1)
				.single();

			const hasAccess = map.user_id === user.id || !!share;
			if (!hasAccess) {
				return respondError(
					'Access denied.',
					403,
					'You do not have permission to access this map.'
				);
			}

			// Fetch comments for the map
			const { data: comments, error: fetchError } = await supabase
				.from('comments')
				.select('*')
				.eq('map_id', mapId)
				.order('created_at', { ascending: true });

			if (fetchError) {
				console.error('Error fetching comments:', fetchError);
				return respondError(
					'Error fetching comments.',
					500,
					fetchError.message
				);
			}

			return respondSuccess(
				{ comments: comments || [] },
				200,
				'Comments fetched successfully.'
			);
		} catch (error) {
			console.error('Error in GET /api/comments:', error);
			return respondError(
				'Error fetching comments.',
				500,
				'Internal server error.'
			);
		}
	}
);

/**
 * POST /api/comments
 * Create a new comment thread
 */
export const POST = withAuthValidation(
	z.object({
		map_id: z.string().uuid(),
		position_x: z.number(),
		position_y: z.number(),
		width: z.number().optional().default(400),
		height: z.number().optional().default(500),
	}),
	async (_req, validatedBody, supabase, user) => {
		try {
			const { map_id, position_x, position_y, width, height } = validatedBody;

			// Verify user has access to the map (owner or active share access)
			const { data: map, error: mapError } = await supabase
				.from('mind_maps')
				.select('id, user_id')
				.eq('id', map_id)
				.single();

			if (mapError || !map) {
				return respondError(
					'Map not found.',
					404,
					'Map not found.'
				);
			}

			// Check if user has share access
			const { data: share } = await supabase
				.from('share_access')
				.select('id')
				.eq('map_id', map_id)
				.eq('user_id', user.id)
				.eq('status', 'active')
				.limit(1)
				.single();

			const hasAccess = map.user_id === user.id || !!share;
			if (!hasAccess) {
				return respondError(
					'Access denied.',
					403,
					'You do not have permission to access this map.'
				);
			}

			// Create the comment
			const { data: newComment, error: insertError } = await supabase
				.from('comments')
				.insert({
					map_id,
					position_x,
					position_y,
					width,
					height,
					created_by: user.id,
				})
				.select()
				.single();

			if (insertError) {
				console.error('Error creating comment:', insertError);
				return respondError(
					'Error creating comment.',
					500,
					insertError.message
				);
			}

			return respondSuccess(
				{ comment: newComment },
				201,
				'Comment created successfully.'
			);
		} catch (error) {
			console.error('Error in POST /api/comments:', error);
			return respondError(
				'Error creating comment.',
				500,
				'Internal server error.'
			);
		}
	}
);
