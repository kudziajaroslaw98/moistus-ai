export type NotificationEventType =
	| 'access_changed'
	| 'access_revoked'
	| 'node_mention'
	| 'comment_mention'
	| 'comment_reply'
	| 'comment_reaction';

export type NotificationEmailStatus =
	| 'pending'
	| 'sent'
	| 'failed'
	| 'skipped_missing_api_key'
	| 'skipped_no_email'
	| 'skipped_preference_off';

export interface NotificationRecord {
	id: string;
	recipient_user_id: string;
	actor_user_id: string | null;
	map_id: string | null;
	event_type: NotificationEventType;
	title: string;
	body: string;
	metadata: Record<string, unknown>;
	dedupe_key: string | null;
	is_read: boolean;
	read_at: string | null;
	email_status: NotificationEmailStatus;
	email_error: string | null;
	emailed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface MentionableUser {
	userId: string;
	slug: string;
	displayName: string;
	avatarUrl: string | null;
	email: string | null;
	role: 'owner' | 'editor' | 'commentator' | 'viewer';
}

export type NotificationEmitEvent =
	| {
			type: 'node_mention';
			mapId: string;
			recipientUserIds: string[];
			nodeId?: string;
			nodeContent?: string;
	  }
	| {
			type: 'comment_mention';
			mapId: string;
			commentId: string;
			messageId: string;
			recipientUserIds: string[];
			messageContent?: string;
	  }
	| {
			type: 'comment_reply';
			mapId: string;
			commentId: string;
			messageId: string;
			recipientUserIds: string[];
			messageContent?: string;
	  }
	| {
			type: 'comment_reaction';
			mapId: string;
			commentId: string;
			messageId: string;
			recipientUserIds: string[];
			emoji: string;
			messageContent?: string;
	  };
