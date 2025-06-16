export interface Comment {
	id: string;
	content: string;
	author_id: string;
	author?: {
		id: string;
		full_name: string;
		display_name?: string;
		avatar_url?: string;
	};
	created_at: string;
	updated_at: string;
	edited_at?: string;
	is_edited: boolean;
	is_resolved: boolean;
	resolved_by?: string;
	resolved_by_user?: {
		id: string;
		full_name: string;
		display_name?: string;
		avatar_url?: string;
	};
	resolved_at?: string;
	parent_comment_id?: string; // For replies
	mentions?: string[]; // Array of user IDs mentioned in the comment
	mentioned_users?: {
		id: string;
		full_name: string;
		display_name?: string;
		avatar_url?: string;
	}[];
	attachments?: CommentAttachment[];
	reactions?: CommentReaction[];
	metadata?: {
		position?: { x: number; y: number };
		highlighted_text?: string;
		context?: string;
		tags?: string[];
		priority?: 'low' | 'medium' | 'high';
		category?: 'feedback' | 'question' | 'suggestion' | 'issue' | 'note';
	};
}

export interface NodeComment extends Comment {
	node_id: string;
	map_id: string;
}

export interface MapComment extends Comment {
	map_id: string;
	position?: { x: number; y: number }; // Position on the canvas
}

export interface CommentAttachment {
	id: string;
	type: 'image' | 'file' | 'link';
	url: string;
	name: string;
	size?: number;
	mime_type?: string;
}

export interface CommentReaction {
	id: string;
	user_id: string;
	user?: {
		id: string;
		full_name: string;
		display_name?: string;
		avatar_url?: string;
	};
	emoji: string;
	created_at: string;
}

export interface CommentThread {
	id: string;
	root_comment: Comment;
	replies: Comment[];
	total_replies: number;
	last_activity: string;
	participants: string[];
	is_locked: boolean;
	locked_by?: string;
	locked_at?: string;
}

export interface CommentFilter {
	author_id?: string;
	is_resolved?: boolean;
	created_after?: string;
	created_before?: string;
	has_replies?: boolean;
	category?: string;
	priority?: string;
	search_text?: string;
	mentioned_user?: string;
}

export interface CommentSort {
	field: 'created_at' | 'updated_at' | 'author_name' | 'replies_count';
	direction: 'asc' | 'desc';
}

export interface CommentPermissions {
	can_create: boolean;
	can_edit_own: boolean;
	can_edit_all: boolean;
	can_delete_own: boolean;
	can_delete_all: boolean;
	can_resolve: boolean;
	can_lock_threads: boolean;
	can_moderate: boolean;
}

export interface CommentNotification {
	id: string;
	user_id: string;
	comment_id: string;
	type: 'mention' | 'reply' | 'reaction' | 'resolution';
	is_read: boolean;
	created_at: string;
}

export interface CommentStats {
	total_comments: number;
	resolved_comments: number;
	unresolved_comments: number;
	total_threads: number;
	active_participants: number;
	avg_response_time?: number;
}

export interface NodeCommentSummary {
	node_id: string;
	comment_count: number;
	unresolved_count: number;
	last_comment_at?: string;
	has_user_comments: boolean;
}

export interface CommentDraft {
	id: string;
	content: string;
	target_type: 'node' | 'map';
	target_id: string;
	position?: { x: number; y: number };
	created_at: string;
	updated_at: string;
}

export type CommentEvent =
	| 'comment_created'
	| 'comment_updated'
	| 'comment_deleted'
	| 'comment_resolved'
	| 'comment_unresolved'
	| 'reply_added'
	| 'reaction_added'
	| 'reaction_removed'
	| 'thread_locked'
	| 'thread_unlocked';

export interface CommentEventData {
	event: CommentEvent;
	comment: Comment;
	user_id: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}
