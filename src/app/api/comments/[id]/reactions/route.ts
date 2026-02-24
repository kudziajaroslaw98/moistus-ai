import { respondError, respondSuccess } from '@/helpers/api/responses';
import { canUserWriteComments } from '@/helpers/api/comment-permissions';
import { createClient } from '@/helpers/supabase/server';
import { z } from 'zod';

/**
 * POST /api/comments/[id]/reactions
 * Add an emoji reaction to a message
 */
export async function POST(
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

		// Parse and validate request body
		const body = await req.json().catch(() => ({}));
		const reactionSchema = z.object({
			message_id: z.string().uuid(),
			emoji: z.string().min(1, 'Emoji is required'),
		});

		const validationResult = reactionSchema.safeParse(body);

		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues
				.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
				.join(', ');
			return respondError(errorMessage, 400, 'Invalid request body.');
		}

		const { message_id, emoji } = validationResult.data;

		// Verify message exists and belongs to the comment
		const { data: message, error: messageError } = await supabase
			.from('comment_messages')
			.select('id, comment_id')
			.eq('id', message_id)
			.eq('comment_id', commentId)
			.single();

		if (messageError || !message) {
			return respondError(
				'Message not found or does not belong to this comment.',
				404,
				'Message not found.'
			);
		}

		// Check if user already reacted with this emoji
		const { data: existingReaction } = await supabase
			.from('comment_reactions')
			.select('id')
			.eq('message_id', message_id)
			.eq('user_id', user.id)
			.eq('emoji', emoji)
			.maybeSingle();

		if (existingReaction) {
			return respondError(
				'You have already reacted with this emoji.',
				409,
				'Duplicate reaction.'
			);
		}

		// Create the reaction
		const { data: newReaction, error: insertError } = await supabase
			.from('comment_reactions')
			.insert({
				message_id,
				user_id: user.id,
				emoji,
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error creating reaction:', insertError);
			return respondError('Error creating reaction.', 500, insertError.message);
		}

		return respondSuccess(
			{ reaction: newReaction },
			201,
			'Reaction created successfully.'
		);
	} catch (error) {
		console.error('Error in POST /api/comments/[id]/reactions:', error);
		return respondError(
			'Error creating reaction.',
			500,
			'Internal server error.'
		);
	}
}

/**
 * DELETE /api/comments/[id]/reactions
 * Remove an emoji reaction from a message
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

		// Parse and validate request body
		const body = await req.json().catch(() => ({}));
		const reactionSchema = z.object({
			reaction_id: z.string().uuid(),
		});

		const validationResult = reactionSchema.safeParse(body);

		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues
				.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
				.join(', ');
			return respondError(errorMessage, 400, 'Invalid request body.');
		}

		const { reaction_id } = validationResult.data;

		const { data: reaction, error: reactionError } = await supabase
			.from('comment_reactions')
			.select('id, user_id, message_id')
			.eq('id', reaction_id)
			.maybeSingle();

		if (reactionError || !reaction) {
			return respondError(
				'Reaction not found or not owned by user.',
				404,
				'Reaction not found.'
			);
		}

		const { data: message, error: messageError } = await supabase
			.from('comment_messages')
			.select('id, comment_id')
			.eq('id', reaction.message_id)
			.maybeSingle();

		if (messageError || !message || message.comment_id !== commentId) {
			return respondError(
				'Reaction not found or not owned by user.',
				404,
				'Reaction not found.'
			);
		}

		// Delete the reaction (only if user owns it)
		const { data: deletedReaction, error: deleteError } = await supabase
			.from('comment_reactions')
			.delete()
			.eq('id', reaction_id)
			.eq('user_id', user.id)
			.select()
			.maybeSingle();

		if (deleteError) {
			console.error('Error deleting reaction:', deleteError);
			return respondError('Error deleting reaction.', 500, deleteError.message);
		}

		if (!deletedReaction) {
			return respondError(
				'Reaction not found or not owned by user.',
				404,
				'Reaction not found.'
			);
		}

		return respondSuccess(
			{ message: 'Reaction deleted successfully.' },
			200,
			'Reaction deleted successfully.'
		);
	} catch (error) {
		console.error('Error in DELETE /api/comments/[id]/reactions:', error);
		return respondError(
			'Error deleting reaction.',
			500,
			'Internal server error.'
		);
	}
}
