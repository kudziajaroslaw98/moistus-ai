import generateUuid from '@/helpers/generate-uuid';
import {
	generateFallbackAvatar,
	generateFunName,
} from '@/helpers/user-profile-helpers';
import {
	getWorkspaceCacheRecord,
	queueMutation,
	setWorkspaceCacheRecord,
} from '@/lib/offline';
import type {
	Comment,
	CommentMessage,
	CommentReaction,
	CreateCommentRequest,
	CreateMessageRequest,
	CreateReactionRequest,
} from '@/types/comment';
import type { NotificationEmitEvent } from '@/types/notification';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

const NOTIFICATION_RECIPIENTS_PER_EVENT_LIMIT = 50;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
	if (items.length === 0) {
		return [];
	}

	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += chunkSize) {
		chunks.push(items.slice(index, index + chunkSize));
	}
	return chunks;
}

function toErrorLogPayload(error: unknown): {
	message: string;
	details?: unknown;
} {
	if (error instanceof Error) {
		return { message: error.message };
	}

	if (typeof error === 'string') {
		return { message: error };
	}

	return { message: 'Unknown error', details: error };
}

function parseCachedCommentsPayload(payload: unknown): Comment[] | null {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return null;
	}

	const record = payload as { comments?: unknown };
	return Array.isArray(record.comments)
		? (record.comments as Comment[])
		: null;
}

function parseCachedMessagesPayload(payload: unknown): CommentMessage[] | null {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return null;
	}

	const record = payload as { messages?: unknown };
	return Array.isArray(record.messages)
		? (record.messages as CommentMessage[])
		: null;
}

export interface CommentsSlice {
	// State
	comments: Comment[];
	commentMessages: Record<string, CommentMessage[]>; // Keyed by comment_id
	activeCommentId: string | null;
	isLoadingComments: boolean;
	commentError: string | null;
	_commentsSubscription: RealtimeChannel | null;

	// Comment CRUD
	fetchComments: (mapId: string) => Promise<void>;
	createComment: (data: CreateCommentRequest) => Promise<Comment | null>;
	updateCommentPosition: (
		commentId: string,
		position: { x: number; y: number }
	) => Promise<void>;
	updateCommentDimensions: (
		commentId: string,
		width: number,
		height: number
	) => Promise<void>;
	deleteComment: (commentId: string) => Promise<void>;

	// Message CRUD
	fetchMessages: (commentId: string) => Promise<void>;
	addMessage: (
		commentId: string,
		data: CreateMessageRequest
	) => Promise<CommentMessage | null>;
	deleteMessage: (commentId: string, messageId: string) => Promise<void>;

	// Reaction CRUD
	addReaction: (
		messageId: string,
		data: CreateReactionRequest
	) => Promise<void>;
	removeReaction: (reactionId: string) => Promise<void>;

	// UI State
	setActiveComment: (commentId: string | null) => void;
	getCommentById: (commentId: string) => Comment | undefined;
	getMessagesForComment: (commentId: string) => CommentMessage[];

	// Real-time subscription management
	subscribeToCommentUpdates: (mapId: string) => Promise<void>;
	unsubscribeFromCommentUpdates: () => Promise<void>;
}

export const createCommentsSlice: StateCreator<
	AppState,
	[],
	[],
	CommentsSlice
> = (set, get) => ({
	// Initial state
	comments: [],
	commentMessages: {},
	activeCommentId: null,
	isLoadingComments: false,
	commentError: null,
	_commentsSubscription: null,

	// ============================================================================
	// Comment CRUD Operations
	// ============================================================================

	fetchComments: async (mapId: string) => {
		set({ isLoadingComments: true, commentError: null });

		try {
			const { supabase } = get();
			const { data, error } = await supabase
				.from('comments')
				.select('*')
				.eq('map_id', mapId)
				.order('created_at', { ascending: true });

				if (error) throw error;

				set({ comments: data || [], isLoadingComments: false });
				await setWorkspaceCacheRecord(`comments:${mapId}`, {
					comments: data || [],
				});
			} catch (error) {
				console.error('Error fetching comments:', error);
				const cachedComments = await getWorkspaceCacheRecord(`comments:${mapId}`);
				const cachedCommentsPayload = parseCachedCommentsPayload(
					cachedComments?.payload
				);
				if (cachedCommentsPayload) {
					set({
						comments: cachedCommentsPayload,
						isLoadingComments: false,
						commentError: null,
					});
					return;
			}
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to fetch comments',
				isLoadingComments: false,
			});
		}
	},

	createComment: async (data: CreateCommentRequest) => {
		const { supabase, currentUser } = get();

		if (!currentUser) {
			console.error('User must be authenticated to create comments');
			set({ commentError: 'Authentication required' });
			return null;
		}

		try {
			const commentId = data.id ?? generateUuid();
			const now = new Date().toISOString();

			// Optimistic update
			const optimisticComment: Comment = {
				id: commentId,
				map_id: data.map_id,
				position_x: data.position_x,
				position_y: data.position_y,
				width: data.width || 400,
				height: data.height || 512,
				created_by: currentUser.id,
				created_at: now,
				updated_at: now,
			};

			set((state) => ({
				comments: [...state.comments, optimisticComment],
			}));

			let savedComment: Comment | null = null;
			try {
				const mutation = await queueMutation<Comment>({
					entity: 'comments',
					action: 'insert',
					payload: {
						table: 'comments',
						values: {
							id: commentId,
							map_id: data.map_id,
							position_x: data.position_x,
							position_y: data.position_y,
							width: data.width || 400,
							height: data.height || 512,
							created_by: currentUser.id,
						},
						select: '*',
					},
					executeOnline: async () => {
						const { data: createdComment, error } = await supabase
							.from('comments')
							.insert({
								id: commentId,
								map_id: data.map_id,
								position_x: data.position_x,
								position_y: data.position_y,
								width: data.width || 400,
								height: data.height || 512,
								created_by: currentUser.id,
							})
							.select()
							.single();

						if (error || !createdComment) {
							throw error ?? new Error('Failed to create comment');
						}

						return createdComment as Comment;
					},
				});

				if (mutation.status === 'applied') {
					savedComment = mutation.data ?? null;
				}
			} catch (error) {
				// Rollback optimistic update
				set((state) => ({
					comments: state.comments.filter((c) => c.id !== commentId),
					commentError: error instanceof Error ? error.message : 'Failed to create comment',
				}));
				throw error;
			}

			// Update with server response
			if (savedComment) {
				set((state) => ({
					comments: state.comments.map((c) =>
						c.id === commentId ? savedComment! : c
					),
				}));
			}

			return savedComment ?? optimisticComment;
		} catch (error) {
			console.error('Error creating comment:', error);
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to create comment',
			});
			return null;
		}
	},

	updateCommentPosition: async (
		commentId: string,
		position: { x: number; y: number }
	) => {
		const { supabase } = get();

		try {
			// Optimistic update
			set((state) => ({
				comments: state.comments.map((c) =>
					c.id === commentId
						? {
								...c,
								position_x: position.x,
								position_y: position.y,
								updated_at: new Date().toISOString(),
							}
						: c
				),
			}));

			await queueMutation({
				entity: 'comments',
				action: 'update',
				payload: {
					table: 'comments',
					values: {
						position_x: position.x,
						position_y: position.y,
						updated_at: new Date().toISOString(),
					},
					match: {
						id: commentId,
					},
				},
				executeOnline: async () => {
					const { error } = await supabase
						.from('comments')
						.update({
							position_x: position.x,
							position_y: position.y,
							updated_at: new Date().toISOString(),
						})
						.eq('id', commentId);

					if (error) throw error;
				},
			});
		} catch (error) {
			console.error('Error updating comment position:', error);
			set({
				commentError:
					error instanceof Error
						? error.message
						: 'Failed to update comment position',
			});
		}
	},

	updateCommentDimensions: async (
		commentId: string,
		width: number,
		height: number
	) => {
		const { supabase } = get();

		try {
			// Optimistic update
			set((state) => ({
				comments: state.comments.map((c) =>
					c.id === commentId
						? {
								...c,
								width,
								height,
								updated_at: new Date().toISOString(),
							}
						: c
				),
			}));

			await queueMutation({
				entity: 'comments',
				action: 'update',
				payload: {
					table: 'comments',
					values: {
						width,
						height,
						updated_at: new Date().toISOString(),
					},
					match: {
						id: commentId,
					},
				},
				executeOnline: async () => {
					const { error } = await supabase
						.from('comments')
						.update({
							width,
							height,
							updated_at: new Date().toISOString(),
						})
						.eq('id', commentId);

					if (error) throw error;
				},
			});
		} catch (error) {
			console.error('Error updating comment dimensions:', error);
			set({
				commentError:
					error instanceof Error
						? error.message
						: 'Failed to update comment dimensions',
			});
		}
	},

	deleteComment: async (commentId: string) => {
		const { supabase, nodes, deleteNodes } = get();
		const pairedNode = nodes.find((node) => node.id === commentId);

		try {
			// Optimistic update
			set((state) => {
				const { [commentId]: _, ...remainingMessages } = state.commentMessages;
				return {
					comments: state.comments.filter((c) => c.id !== commentId),
					commentMessages: remainingMessages,
				};
			});

			await queueMutation({
				entity: 'comments',
				action: 'delete',
				payload: {
					table: 'comments',
					match: {
						id: commentId,
					},
				},
				executeOnline: async () => {
					const { error } = await supabase
						.from('comments')
						.delete()
						.eq('id', commentId);

					if (error) throw error;
				},
			});

			if (pairedNode) {
				await deleteNodes([pairedNode]);
			}
		} catch (error) {
			console.error('Error deleting comment:', error);
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to delete comment',
			});
		}
	},

	// ============================================================================
	// Message CRUD Operations
	// ============================================================================

	fetchMessages: async (commentId: string) => {
		const { supabase } = get();

		try {
			// Fetch messages with reactions
			const { data, error } = await supabase
				.from('comment_messages')
				.select('*, reactions:comment_reactions(*)')
				.eq('comment_id', commentId)
				.order('created_at', { ascending: true });

			if (error) throw error;

			if (!data || data.length === 0) {
				set((state) => ({
					commentMessages: {
						...state.commentMessages,
						[commentId]: [],
					},
				}));
				return;
			}

			// Extract unique user IDs from messages
			const userIds = [...new Set(data.map((msg) => msg.user_id as string))];

			// Batch fetch all user profiles
			const { data: profiles } = await supabase
				.from('user_profiles')
				.select('user_id, display_name, full_name, avatar_url')
				.in('user_id', userIds);

			// Create a map of user_id -> profile for quick lookup
			const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

			// Enrich messages with user data from fetched profiles
			const messages: CommentMessage[] = data.map((msg) => {
				const profile = profileMap.get(msg.user_id);
				const userId = msg.user_id;

				// Generate fallback avatar and display name using established patterns
				const displayName =
					profile?.display_name ||
					profile?.full_name ||
					generateFunName(userId);
				const avatarUrl = profile?.avatar_url || generateFallbackAvatar(userId);

				return {
					...msg,
					user: {
						display_name: displayName,
						avatar_url: avatarUrl,
						full_name: profile?.full_name,
					},
					reactions: msg.reactions || [],
				};
			});

				set((state) => ({
					commentMessages: {
						...state.commentMessages,
						[commentId]: messages,
					},
				}));
				await setWorkspaceCacheRecord(`comment-messages:${commentId}`, {
					messages,
				});
			} catch (error) {
				console.error('Error fetching messages:', error);
				const cachedMessages = await getWorkspaceCacheRecord(
					`comment-messages:${commentId}`
				);
				const cachedMessagesPayload = parseCachedMessagesPayload(
					cachedMessages?.payload
				);
				if (cachedMessagesPayload) {
					set((state) => ({
						commentMessages: {
							...state.commentMessages,
							[commentId]: cachedMessagesPayload,
						},
						commentError: null,
					}));
					return;
			}
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to fetch messages',
			});
		}
	},

	addMessage: async (commentId: string, data: CreateMessageRequest) => {
		const { supabase, currentUser, userProfile, comments, commentMessages } =
			get();

		if (!currentUser) {
			console.error('User must be authenticated to add messages');
			set({ commentError: 'Authentication required' });
			return null;
		}

		try {
			const messageId = generateUuid();
			const now = new Date().toISOString();
			const comment = comments.find((entry) => entry.id === commentId);
			const mapId = comment?.map_id;
			const mentionRecipientIds = Array.from(
				new Set(
					(data.mentioned_users || []).filter(
						(id): id is string => Boolean(id) && id !== currentUser.id
					)
				)
			);
			const threadParticipants = new Set(
				(commentMessages[commentId] || []).map((message) => message.user_id)
			);
			if (comment?.created_by) {
				threadParticipants.add(comment.created_by);
			}
			threadParticipants.delete(currentUser.id);
			for (const mentionedUserId of mentionRecipientIds) {
				threadParticipants.delete(mentionedUserId);
			}
			const replyRecipientIds = Array.from(threadParticipants);

			// Optimistic update
			const optimisticMessage: CommentMessage = {
				id: messageId,
				comment_id: commentId,
				user_id: currentUser.id,
				content: data.content,
				mentioned_users: data.mentioned_users || [],
				created_at: now,
				updated_at: now,
				user: {
					display_name:
						userProfile?.display_name ||
						currentUser.email?.split('@')[0] ||
						'Anonymous',
					avatar_url: userProfile?.avatar_url,
					full_name: userProfile?.full_name,
				},
				reactions: [],
			};

			set((state) => ({
				commentMessages: {
					...state.commentMessages,
					[commentId]: [
						...(state.commentMessages[commentId] || []),
						optimisticMessage,
					],
				},
			}));

			let savedMessage: CommentMessage | null = null;
			try {
				const mutation = await queueMutation<CommentMessage>({
					entity: 'comment_messages',
					action: 'insert',
					payload: {
						table: 'comment_messages',
						values: {
							id: messageId,
							comment_id: commentId,
							user_id: currentUser.id,
							content: data.content,
							mentioned_users: data.mentioned_users || [],
						},
						select: '*',
					},
					executeOnline: async () => {
						const { data: createdMessage, error } = await supabase
							.from('comment_messages')
							.insert({
								id: messageId,
								comment_id: commentId,
								user_id: currentUser.id,
								content: data.content,
								mentioned_users: data.mentioned_users || [],
							})
							.select()
							.single();
						if (error || !createdMessage) {
							throw error ?? new Error('Failed to add message');
						}

						return createdMessage as CommentMessage;
					},
				});

				if (mutation.status === 'applied') {
					savedMessage = mutation.data ?? null;
				}
			} catch (error) {
				// Rollback optimistic update
				set((state) => ({
					commentMessages: {
						...state.commentMessages,
						[commentId]: (state.commentMessages[commentId] || []).filter(
							(m) => m.id !== messageId
						),
					},
					commentError: error instanceof Error ? error.message : 'Failed to add message',
				}));
				throw error;
			}

			// Update with server response
			if (savedMessage) {
				set((state) => ({
					commentMessages: {
						...state.commentMessages,
						[commentId]: (state.commentMessages[commentId] || []).map((m) =>
							m.id === messageId ? { ...savedMessage!, ...optimisticMessage } : m
						),
					},
				}));
			}

			if (mapId) {
				const events: NotificationEmitEvent[] = [];
				for (const recipientChunk of chunkArray(
					mentionRecipientIds,
					NOTIFICATION_RECIPIENTS_PER_EVENT_LIMIT
				)) {
					events.push({
						type: 'comment_mention',
						mapId,
						commentId,
						messageId,
						recipientUserIds: recipientChunk,
						messageContent: data.content,
					});
				}
				for (const recipientChunk of chunkArray(
					replyRecipientIds,
					NOTIFICATION_RECIPIENTS_PER_EVENT_LIMIT
				)) {
					events.push({
						type: 'comment_reply',
						mapId,
						commentId,
						messageId,
						recipientUserIds: recipientChunk,
						messageContent: data.content,
					});
				}

				if (events.length > 0) {
					void (async () => {
						for (const event of events) {
							try {
								const response = await fetch('/api/notifications/emit', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ events: [event] }),
								});
								if (!response.ok) {
									console.warn('[comments-slice] notification emit failed', {
										eventType: event.type,
										status: response.status,
										statusText: response.statusText,
									});
								}
							} catch (notificationError: unknown) {
								console.warn(
									'[comments-slice] failed to emit comment notifications',
									toErrorLogPayload(notificationError)
								);
							}
						}
					})();
				}
			}

			return savedMessage ?? optimisticMessage;
		} catch (error) {
			console.error('Error adding message:', error);
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to add message',
			});
			return null;
		}
	},

	deleteMessage: async (commentId: string, messageId: string) => {
		const { supabase } = get();

		try {
			// Optimistic update
			set((state) => ({
				commentMessages: {
					...state.commentMessages,
					[commentId]: (state.commentMessages[commentId] || []).filter(
						(m) => m.id !== messageId
					),
				},
			}));

			await queueMutation({
				entity: 'comment_messages',
				action: 'delete',
				payload: {
					table: 'comment_messages',
					match: {
						id: messageId,
					},
				},
				executeOnline: async () => {
					const { error } = await supabase
						.from('comment_messages')
						.delete()
						.eq('id', messageId);

					if (error) throw error;
				},
			});
		} catch (error) {
			console.error('Error deleting message:', error);
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to delete message',
			});
		}
	},

	// ============================================================================
	// Reaction CRUD Operations
	// ============================================================================

	addReaction: async (messageId: string, data: CreateReactionRequest) => {
		const { supabase, currentUser, commentMessages } = get();

		if (!currentUser) {
			console.error('User must be authenticated to add reactions');
			set({ commentError: 'Authentication required' });
			return;
		}

		try {
			// Find which comment this message belongs to
			let targetCommentId: string | null = null;
			let targetMessage: CommentMessage | null = null;

			for (const [commentId, messages] of Object.entries(commentMessages)) {
				const message = messages.find((m) => m.id === messageId);
				if (message) {
					targetCommentId = commentId;
					targetMessage = message;
					break;
				}
			}

			if (!targetCommentId || !targetMessage) {
				throw new Error('Comment not found for message');
			}

			// Check if user already has this reaction (toggle behavior)
			const existingReaction = targetMessage.reactions?.find(
				(r) => r.user_id === currentUser.id && r.emoji === data.emoji
			);

			if (existingReaction) {
				// User already reacted with this emoji, remove it instead
				await get().removeReaction(existingReaction.id);
				return;
			}

			const reactionId = generateUuid();

			// Optimistic update
			const optimisticReaction: CommentReaction = {
				id: reactionId,
				message_id: messageId,
				user_id: currentUser.id,
				emoji: data.emoji,
				created_at: new Date().toISOString(),
			};

			set((state) => ({
				commentMessages: {
					...state.commentMessages,
					[targetCommentId!]: (
						state.commentMessages[targetCommentId!] || []
					).map((m) =>
						m.id === messageId
							? {
									...m,
									reactions: [...(m.reactions || []), optimisticReaction],
								}
							: m
					),
				},
			}));

			let reactionError: Error | null = null;
			try {
				await queueMutation({
					entity: 'comment_reactions',
					action: 'insert',
					payload: {
						table: 'comment_reactions',
						values: {
							id: reactionId,
							message_id: messageId,
							user_id: currentUser.id,
							emoji: data.emoji,
						},
					},
					executeOnline: async () => {
						const { error } = await supabase.from('comment_reactions').insert({
							id: reactionId,
							message_id: messageId,
							user_id: currentUser.id,
							emoji: data.emoji,
						});

						if (error) {
							const wrapped = new Error(error.message);
							(wrapped as Error & { code?: string }).code = error.code;
							throw wrapped;
						}
					},
				});
			} catch (error) {
				reactionError = error instanceof Error ? error : new Error('Unknown reaction error');
			}

			if (reactionError) {
				// Handle duplicate constraint error silently (race condition)
				const duplicateCode = (reactionError as Error & { code?: string }).code;
				if (duplicateCode === '23505') {
					// Unique constraint violation - reaction already exists
					// Just rollback the optimistic update, no need to show error
					set((state) => ({
						commentMessages: {
							...state.commentMessages,
							[targetCommentId!]: (
								state.commentMessages[targetCommentId!] || []
							).map((m) =>
								m.id === messageId
									? {
											...m,
											reactions: (m.reactions || []).filter(
												(r) => r.id !== reactionId
											),
										}
									: m
							),
						},
					}));
					return;
				}

				// Other errors - rollback and show error
				set((state) => ({
					commentMessages: {
						...state.commentMessages,
						[targetCommentId!]: (
							state.commentMessages[targetCommentId!] || []
						).map((m) =>
							m.id === messageId
								? {
										...m,
										reactions: (m.reactions || []).filter(
											(r) => r.id !== reactionId
										),
									}
								: m
						),
					},
					commentError: reactionError.message,
				}));
				throw reactionError;
			}

			if (targetMessage.user_id !== currentUser.id) {
				const targetComment = get().comments.find(
					(comment) => comment.id === targetCommentId
				);
				if (targetComment?.map_id) {
					void fetch('/api/notifications/emit', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							events: [
								{
									type: 'comment_reaction',
									mapId: targetComment.map_id,
									commentId: targetCommentId,
									messageId,
									recipientUserIds: [targetMessage.user_id],
									emoji: data.emoji,
									messageContent: targetMessage.content,
								},
							],
						}),
					})
						.then((response) => {
							if (!response.ok) {
								console.warn(
									'[comments-slice] comment reaction notification emit failed',
									{
										status: response.status,
										statusText: response.statusText,
									}
								);
							}
						})
						.catch((notificationError: unknown) => {
							console.warn(
								'[comments-slice] failed to emit comment reaction notification',
								toErrorLogPayload(notificationError)
							);
						});
				}
			}
		} catch (error) {
			console.error('Error adding reaction:', error);
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to add reaction',
			});
		}
	},

	removeReaction: async (reactionId: string) => {
		const { supabase, commentMessages } = get();

		try {
			// Find the reaction to remove
			let targetCommentId: string | null = null;
			let targetMessageId: string | null = null;

			for (const [commentId, messages] of Object.entries(commentMessages)) {
				for (const message of messages) {
					if (message.reactions?.some((r) => r.id === reactionId)) {
						targetCommentId = commentId;
						targetMessageId = message.id;
						break;
					}
				}

				if (targetCommentId) break;
			}

			if (!targetCommentId || !targetMessageId) {
				throw new Error('Reaction not found');
			}

			// Optimistic update
			set((state) => ({
				commentMessages: {
					...state.commentMessages,
					[targetCommentId!]: (
						state.commentMessages[targetCommentId!] || []
					).map((m) =>
						m.id === targetMessageId
							? {
									...m,
									reactions: (m.reactions || []).filter(
										(r) => r.id !== reactionId
									),
								}
							: m
					),
				},
			}));

			await queueMutation({
				entity: 'comment_reactions',
				action: 'delete',
				payload: {
					table: 'comment_reactions',
					match: {
						id: reactionId,
					},
				},
				executeOnline: async () => {
					const { error } = await supabase
						.from('comment_reactions')
						.delete()
						.eq('id', reactionId);

					if (error) throw error;
				},
			});
		} catch (error) {
			console.error('Error removing reaction:', error);
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to remove reaction',
			});
		}
	},

	// ============================================================================
	// UI State Management
	// ============================================================================

	setActiveComment: (commentId: string | null) => {
		set({ activeCommentId: commentId });

		// Auto-fetch messages when activating a comment
		if (commentId) {
			get().fetchMessages(commentId);
		}
	},

	getCommentById: (commentId: string) => {
		const { comments } = get();
		return comments.find((c) => c.id === commentId);
	},

	getMessagesForComment: (commentId: string) => {
		const { commentMessages } = get();
		return commentMessages[commentId] || [];
	},

	// ============================================================================
	// Real-time Subscriptions
	// ============================================================================

	subscribeToCommentUpdates: async (mapId: string) => {
		const { supabase, _commentsSubscription } = get();

		// Unsubscribe from previous subscription if exists
		if (_commentsSubscription) {
			await supabase.removeChannel(_commentsSubscription);
		}

		try {
			const channel = supabase
				.channel(`comments:${mapId}`)
				.on(
					'postgres_changes',
					{
						event: '*',
						schema: 'public',
						table: 'comments',
						filter: `map_id=eq.${mapId}`,
					},
					(payload) => {
						const { eventType, new: newRecord, old: oldRecord } = payload;

						switch (eventType) {
							case 'INSERT':
								set((state) => {
									const newComment = newRecord as Comment;
									// Prevent duplicates: only add if comment doesn't already exist
									const exists = state.comments.some(
										(c) => c.id === newComment.id
									);
									if (exists) return state;

									return {
										comments: [...state.comments, newComment],
									};
								});
								break;

							case 'UPDATE':
								set((state) => ({
									comments: state.comments.map((c) =>
										c.id === (newRecord as Comment).id
											? (newRecord as Comment)
											: c
									),
								}));
								break;

							case 'DELETE':
								set((state) => {
									const deletedId = (oldRecord as Comment).id;
									const { [deletedId]: _, ...remainingMessages } =
										state.commentMessages;
									return {
										comments: state.comments.filter((c) => c.id !== deletedId),
										commentMessages: remainingMessages,
									};
								});
								break;
						}
					}
				)
				.on(
					'postgres_changes',
					{
						event: '*',
						schema: 'public',
						table: 'comment_messages',
					},
					async (payload) => {
						const { eventType, new: newRecord, old: oldRecord } = payload;
						const message = (newRecord || oldRecord) as
							| CommentMessage
							| undefined;

						if (!message || !message.comment_id) return;

						const commentId = message.comment_id;

						switch (eventType) {
							case 'INSERT':
								// Add message from real-time event - fetch user profile for accurate display
								const { supabase: db } = get();
								const newMessage = newRecord as CommentMessage;
								const userId = newMessage.user_id;

								// Fetch the user profile for this message author
								const { data: profile } = await db
									.from('user_profiles')
									.select('display_name, full_name, avatar_url')
									.eq('user_id', userId)
									.single();

								// Generate fallback avatar and display name using established patterns
								const displayName =
									profile?.display_name ||
									profile?.full_name ||
									generateFunName(userId);
								const avatarUrl =
									profile?.avatar_url || generateFallbackAvatar(userId);

								const enrichedMessage: CommentMessage = {
									...newMessage,
									user: {
										display_name: displayName,
										avatar_url: avatarUrl,
										full_name: profile?.full_name,
									},
									reactions: [],
								};

								set((state) => {
									const existingMessages =
										state.commentMessages[commentId] || [];
									// Prevent duplicates: only add if message doesn't already exist
									const exists = existingMessages.some(
										(m) => m.id === newMessage.id
									);
									if (exists) {
										// Message already exists (from optimistic update), update it with server data
										return {
											commentMessages: {
												...state.commentMessages,
												[commentId]: existingMessages.map((m) =>
													m.id === newMessage.id ? enrichedMessage : m
												),
											},
										};
									}

									// Message doesn't exist, add it
									return {
										commentMessages: {
											...state.commentMessages,
											[commentId]: [...existingMessages, enrichedMessage],
										},
									};
								});

								break;

							case 'DELETE':
								set((state) => ({
									commentMessages: {
										...state.commentMessages,
										[commentId]: (
											state.commentMessages[commentId] || []
										).filter((m) => m.id !== (oldRecord as CommentMessage).id),
									},
								}));
								break;
						}
					}
				)
				.on(
					'postgres_changes',
					{
						event: '*',
						schema: 'public',
						table: 'comment_reactions',
					},
					async (payload) => {
						const { eventType, new: newRecord, old: oldRecord } = payload;
						const reaction =
							(newRecord as CommentReaction) || (oldRecord as CommentReaction);

						if (!reaction || !reaction.message_id) return;

						const messageId = reaction.message_id;

						// Find which comment this message belongs to
						let targetCommentId: string | null = null;
						const { commentMessages } = get();

						for (const [commentId, messages] of Object.entries(
							commentMessages
						)) {
							if (messages.some((m) => m.id === messageId)) {
								targetCommentId = commentId;
								break;
							}
						}

						if (!targetCommentId) return;

						switch (eventType) {
							case 'INSERT':
								set((state) => {
									const newReaction = newRecord as CommentReaction;
									return {
										commentMessages: {
											...state.commentMessages,
											[targetCommentId!]: (
												state.commentMessages[targetCommentId!] || []
											).map((m) => {
												if (m.id !== messageId) return m;

												// Prevent duplicates: only add if reaction doesn't already exist
												const existingReactions = m.reactions || [];
												const exists = existingReactions.some(
													(r) => r.id === newReaction.id
												);

												return {
													...m,
													reactions: exists
														? existingReactions
														: [...existingReactions, newReaction],
												};
											}),
										},
									};
								});
								break;

							case 'DELETE':
								set((state) => ({
									commentMessages: {
										...state.commentMessages,
										[targetCommentId!]: (
											state.commentMessages[targetCommentId!] || []
										).map((m) =>
											m.id === messageId
												? {
														...m,
														reactions: (m.reactions || []).filter(
															(r) => r.id !== (oldRecord as CommentReaction).id
														),
													}
												: m
										),
									},
								}));
								break;
						}
					}
				)
				.subscribe();

			set({ _commentsSubscription: channel });
		} catch (error) {
			console.error('Error subscribing to comment updates:', error);
			set({
				commentError:
					error instanceof Error
						? error.message
						: 'Failed to subscribe to comment updates',
			});
		}
	},

	unsubscribeFromCommentUpdates: async () => {
		const { supabase, _commentsSubscription } = get();

		if (_commentsSubscription) {
			await supabase.removeChannel(_commentsSubscription);
			set({ _commentsSubscription: null });
		}
	},
});
