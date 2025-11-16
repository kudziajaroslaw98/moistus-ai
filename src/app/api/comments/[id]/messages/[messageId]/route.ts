import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createClient } from '@/helpers/supabase/server';

/**
 * DELETE /api/comments/[id]/messages/[messageId]
 * Delete a specific message from a comment thread
 */
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string; messageId: string }> }
) {
	const supabase = await createClient();

	try {
		const { id: commentId, messageId } = await params;

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

		// Delete the message (CASCADE will handle reactions)
		// Only allow deletion if user owns the message
		// Request deleted rows to detect if message exists and is owned by user
		const { data: deletedRows, error: deleteError } = await supabase
			.from('comment_messages')
			.delete()
			.eq('id', messageId)
			.eq('comment_id', commentId)
			.eq('user_id', user.id)
			.select();

		if (deleteError) {
			console.error('Error deleting message:', deleteError);
			return respondError('Error deleting message.', 500, deleteError.message);
		}

		// Check if any rows were actually deleted
		if (!deletedRows || deletedRows.length === 0) {
			return respondError(
				'Message not found or not owned by user.',
				404,
				'Message not found.'
			);
		}

		return respondSuccess(
			{ message: 'Message deleted successfully.' },
			200,
			'Message deleted successfully.'
		);
	} catch (error) {
		console.error('Error in DELETE /api/comments/[id]/messages/[messageId]:', error);
		return respondError(
			'Error deleting message.',
			500,
			'Internal server error.'
		);
	}
}
