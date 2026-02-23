import { respondError, respondSuccess } from '@/helpers/api/responses';
import { canUserWriteComments } from '@/helpers/api/comment-permissions';
import { createClient } from '@/helpers/supabase/server';
import { z } from 'zod';

/**
 * GET /api/comments/[id]
 * Fetch a single comment with its messages
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const supabase = await createClient();

	try {
		const { id: commentId } = await params;

		// Get authenticated user
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return respondError(
				'Authentication required',
				401,
				'User not authenticated'
			);
		}

		// Fetch comment with messages and user info
		const { data: comment, error: fetchError } = await supabase
			.from('comments')
			.select(
				`
				*,
				messages:comment_messages(
					*,
					user:user_id(
						id,
						email,
						user_metadata
					),
					reactions:comment_reactions(*)
				)
			`
			)
			.eq('id', commentId)
			.single();

		if (fetchError) {
			console.error('Error fetching comment:', fetchError);

			if (fetchError.code === 'PGRST116') {
				return respondError('Comment not found.', 404, 'Comment not found.');
			}

			return respondError(
				'Error fetching comment.',
				500,
				fetchError.message
			);
		}

		return respondSuccess(
			{ comment },
			200,
			'Comment fetched successfully.'
		);
	} catch (error) {
		console.error('Error in GET /api/comments/[id]:', error);
		return respondError(
			'Error fetching comment.',
			500,
			'Internal server error.'
		);
	}
}

/**
 * PUT /api/comments/[id]
 * Update comment position or dimensions
 */
export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const supabase = await createClient();

	try {
		const { id: commentId } = await params;

		// Get authenticated user
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return respondError(
				'Authentication required',
				401,
				'User not authenticated'
			);
		}

		// Parse and validate request body
		const body = await req.json().catch(() => ({}));
		const updateSchema = z.object({
			position_x: z.number().optional(),
			position_y: z.number().optional(),
			width: z.number().optional(),
			height: z.number().optional(),
		});

		const validationResult = updateSchema.safeParse(body);

		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues
				.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
				.join(', ');
			return respondError(errorMessage, 400, 'Invalid request body.');
		}

		const updateData = validationResult.data;

		const { data: comment, error: commentError } = await supabase
			.from('comments')
			.select('id, map_id')
			.eq('id', commentId)
			.maybeSingle();

		if (commentError || !comment) {
			return respondError('Comment not found.', 404, 'Comment not found.');
		}

		const permission = await canUserWriteComments(supabase, comment.map_id, user.id);
		if (!permission.allowed) {
			return respondError(
				'Access denied.',
				403,
				'You do not have permission to comment on this map.'
			);
		}

		// Update the comment (only allow owner to update)
		const { data: updatedComment, error: updateError } = await supabase
			.from('comments')
			.update({
				...updateData,
				updated_at: new Date().toISOString(),
			})
			.eq('id', commentId)
			.eq('created_by', user.id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating comment:', updateError);

			if (updateError.code === 'PGRST116') {
				return respondError(
					'Comment not found or not owned by user.',
					404,
					'Comment not found.'
				);
			}

			return respondError(
				'Error updating comment.',
				500,
				updateError.message
			);
		}

		return respondSuccess(
			{ comment: updatedComment },
			200,
			'Comment updated successfully.'
		);
	} catch (error) {
		console.error('Error in PUT /api/comments/[id]:', error);
		return respondError(
			'Error updating comment.',
			500,
			'Internal server error.'
		);
	}
}

/**
 * DELETE /api/comments/[id]
 * Delete a comment and all its messages/reactions (CASCADE)
 */
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const supabase = await createClient();

	try {
		const { id: commentId } = await params;

		// Get authenticated user
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return respondError(
				'Authentication required',
				401,
				'User not authenticated'
			);
		}

		const { data: comment, error: commentError } = await supabase
			.from('comments')
			.select('id, map_id')
			.eq('id', commentId)
			.maybeSingle();

		if (commentError || !comment) {
			return respondError('Comment not found.', 404, 'Comment not found.');
		}

		const permission = await canUserWriteComments(supabase, comment.map_id, user.id);
		if (!permission.allowed) {
			return respondError(
				'Access denied.',
				403,
				'You do not have permission to comment on this map.'
			);
		}

		// Delete the comment (CASCADE will handle messages and reactions)
		// Request deleted rows to detect if comment exists and is owned by user
		const { data: deletedRows, error: deleteError } = await supabase
			.from('comments')
			.delete()
			.eq('id', commentId)
			.eq('created_by', user.id) // Ensure user owns the comment
			.select();

		if (deleteError) {
			console.error('Error deleting comment:', deleteError);
			return respondError('Error deleting comment.', 500, deleteError.message);
		}

		// Check if any rows were actually deleted
		if (!deletedRows || deletedRows.length === 0) {
			return respondError(
				'Comment not found or not owned by user.',
				404,
				'Comment not found.'
			);
		}

		return respondSuccess(
			{ message: 'Comment deleted successfully.' },
			200,
			'Comment deleted successfully.'
		);
	} catch (error) {
		console.error('Error in DELETE /api/comments/[id]:', error);
		return respondError(
			'Error deleting comment.',
			500,
			'Internal server error.'
		);
	}
}
