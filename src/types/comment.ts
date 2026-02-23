/**
 * Comment Types
 *
 * Type definitions for the comment system.
 * Comments are discussion threads that can be placed on the canvas.
 */

export interface Comment {
	id: string;
	map_id: string;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface CommentWithMessages extends Comment {
	messages: CommentMessage[];
	participants: CommentParticipant[];
	total_messages: number;
}

export interface CommentParticipant {
	user_id: string;
	display_name: string;
	avatar_url?: string;
	message_count: number;
}

/**
 * Comment message from database with user info
 */
export interface CommentMessage {
	id: string;
	comment_id: string;
	user_id: string;
	content: string;
	mentioned_users: string[];
	created_at: string;
	updated_at: string;
	user?: {
		display_name: string;
		avatar_url?: string;
		full_name?: string;
	};
	reactions?: CommentReaction[];
}

/**
 * Emoji reaction on a comment message
 */
export interface CommentReaction {
	id: string;
	message_id: string;
	user_id: string;
	emoji: string;
	created_at: string;
}

/**
 * Grouped reactions for display
 */
export interface GroupedReaction {
	emoji: string;
	count: number;
	user_ids: string[];
	has_current_user: boolean;
}

/**
 * API response types
 */
export interface CommentsListResponse {
	comments: Comment[];
}

export interface CommentDetailResponse {
	comment: CommentWithMessages;
}

export interface MessagesListResponse {
	messages: CommentMessage[];
}

export interface CreateCommentRequest {
	id?: string;
	map_id: string;
	position_x: number;
	position_y: number;
	width?: number;
	height?: number;
}

export interface CreateMessageRequest {
	content: string;
	mentioned_users?: string[];
}

export interface CreateReactionRequest {
	emoji: string;
}

export default Comment;
