import { respondError, respondSuccess } from '@/helpers/api/responses';
import { canUserWriteComments } from '@/helpers/api/comment-permissions';
import { createClient } from '@/helpers/supabase/server';
import { z } from 'zod';

/**
 * GET /api/comments/[id]/messages
 * Fetch all messages for a specific comment thread
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

		// Fetch messages with user info and reactions
		const { data: messages, error: fetchError } = await supabase
			.from('comment_messages')
			.select(
				`
				*,
				user:user_id(
					id,
					email,
					user_metadata
				),
				reactions:comment_reactions(*)
			`
			)
			.eq('comment_id', commentId)
			.order('created_at', { ascending: true });

		if (fetchError) {
			console.error('Error fetching messages:', fetchError);
			return respondError(
				'Error fetching messages.',
				500,
				fetchError.message
			);
		}

		return respondSuccess(
			{ messages: messages || [] },
			200,
			'Messages fetched successfully.'
		);
	} catch (error) {
		console.error('Error in GET /api/comments/[id]/messages:', error);
		return respondError(
			'Error fetching messages.',
			500,
			'Internal server error.'
		);
	}
}

/**
 * POST /api/comments/[id]/messages
 * Add a new message to a comment thread
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

		// Parse and validate request body
		const body = await req.json().catch(() => ({}));
		const messageSchema = z.object({
			content: z.string().min(1, 'Message content is required'),
			mentions: z.array(z.string().uuid()).optional().default([]),
		});

		const validationResult = messageSchema.safeParse(body);

		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues
				.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
				.join(', ');
			return respondError(errorMessage, 400, 'Invalid request body.');
		}

		const { content, mentions } = validationResult.data;

		// Verify comment exists and user has access
		const { data: comment, error: commentError } = await supabase
			.from('comments')
			.select('id, map_id')
			.eq('id', commentId)
			.single();

		if (commentError || !comment) {
			return respondError(
				'Comment not found or access denied.',
				404,
				'Comment not found.'
			);
		}

		const permission = await canUserWriteComments(supabase, comment.map_id, user.id);
		if (!permission.allowed) {
			return respondError(
				'Access denied.',
				403,
				'You do not have permission to comment on this map.'
			);
		}

		// Create the message
		const { data: newMessage, error: insertError } = await supabase
			.from('comment_messages')
			.insert({
				comment_id: commentId,
				user_id: user.id,
				content,
				mentions,
			})
			.select(
				`
				*,
				user:user_id(
					id,
					email,
					user_metadata
				),
				reactions:comment_reactions(*)
			`
			)
			.single();

		if (insertError) {
			console.error('Error creating message:', insertError);
			return respondError(
				'Error creating message.',
				500,
				insertError.message
			);
		}

		return respondSuccess(
			{ message: newMessage },
			201,
			'Message created successfully.'
		);
	} catch (error) {
		console.error('Error in POST /api/comments/[id]/messages:', error);
		return respondError(
			'Error creating message.',
			500,
			'Internal server error.'
		);
	}
}
