import generateUuid from '@/helpers/generate-uuid';
import type {
	Comment,
	CommentMessage,
	CommentReaction,
	CreateCommentRequest,
	CreateMessageRequest,
	CreateReactionRequest,
} from '@/types/comment';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

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
		} catch (error) {
			console.error('Error fetching comments:', error);
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
			const commentId = generateUuid();
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

			// Background save to Supabase
			const { data: savedComment, error } = await supabase
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

			if (error) {
				// Rollback optimistic update
				set((state) => ({
					comments: state.comments.filter((c) => c.id !== commentId),
					commentError: error.message,
				}));
				throw error;
			}

			// Update with server response
			set((state) => ({
				comments: state.comments.map((c) =>
					c.id === commentId ? savedComment : c
				),
			}));

			return savedComment;
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

			// Background save
			const { error } = await supabase
				.from('comments')
				.update({
					position_x: position.x,
					position_y: position.y,
					updated_at: new Date().toISOString(),
				})
				.eq('id', commentId);

			if (error) throw error;
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

			// Background save
			const { error } = await supabase
				.from('comments')
				.update({
					width,
					height,
					updated_at: new Date().toISOString(),
				})
				.eq('id', commentId);

			if (error) throw error;
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
		const { supabase } = get();

		try {
			// Optimistic update
			set((state) => {
				const { [commentId]: _, ...remainingMessages } = state.commentMessages;
				return {
					comments: state.comments.filter((c) => c.id !== commentId),
					commentMessages: remainingMessages,
				};
			});

			// Background delete (cascade will handle messages and reactions)
			const { error } = await supabase
				.from('comments')
				.delete()
				.eq('id', commentId);

			if (error) throw error;
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
		const { supabase, currentUser, userProfile } = get();

		try {
			// Fetch messages with reactions (can't access auth.users directly)
			const { data, error } = await supabase
				.from('comment_messages')
				.select('*, reactions:comment_reactions(*)')
				.eq('comment_id', commentId)
				.order('created_at', { ascending: true });

			if (error) throw error;

			// Enrich messages with user data from current session
			const messages: CommentMessage[] = (data || []).map((msg: any) => {
				// If message is from current user, use their profile
				const isCurrentUser = msg.user_id === currentUser?.id;
				return {
					...msg,
					user: isCurrentUser
						? {
								display_name:
									userProfile?.display_name ||
									currentUser?.email?.split('@')[0] ||
									'Anonymous',
								avatar_url: userProfile?.avatar_url,
								full_name: userProfile?.full_name,
							}
						: {
								display_name: 'User', // Fallback for other users
								avatar_url: undefined,
								full_name: undefined,
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
		} catch (error) {
			console.error('Error fetching messages:', error);
			set({
				commentError:
					error instanceof Error ? error.message : 'Failed to fetch messages',
			});
		}
	},

	addMessage: async (commentId: string, data: CreateMessageRequest) => {
		const { supabase, currentUser, userProfile } = get();

		if (!currentUser) {
			console.error('User must be authenticated to add messages');
			set({ commentError: 'Authentication required' });
			return null;
		}

		try {
			const messageId = generateUuid();
			const now = new Date().toISOString();

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

			// Background save
			const { data: savedMessage, error } = await supabase
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

			if (error) {
				// Rollback optimistic update
				set((state) => ({
					commentMessages: {
						...state.commentMessages,
						[commentId]: (state.commentMessages[commentId] || []).filter(
							(m) => m.id !== messageId
						),
					},
					commentError: error.message,
				}));
				throw error;
			}

			// Update with server response
			set((state) => ({
				commentMessages: {
					...state.commentMessages,
					[commentId]: (state.commentMessages[commentId] || []).map((m) =>
						m.id === messageId ? { ...savedMessage, ...optimisticMessage } : m
					),
				},
			}));

			return savedMessage;
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

			// Background delete
			const { error } = await supabase
				.from('comment_messages')
				.delete()
				.eq('id', messageId);

			if (error) throw error;
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

			// Background save
			const { error } = await supabase.from('comment_reactions').insert({
				id: reactionId,
				message_id: messageId,
				user_id: currentUser.id,
				emoji: data.emoji,
			});

			if (error) {
				// Handle duplicate constraint error silently (race condition)
				if (error.code === '23505') {
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
					commentError: error.message,
				}));
				throw error;
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

			// Background delete
			const { error } = await supabase
				.from('comment_reactions')
				.delete()
				.eq('id', reactionId);

			if (error) throw error;
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
									const exists = state.comments.some((c) => c.id === newComment.id);
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
								// Add message from real-time event (user data comes from optimistic updates)
								const { currentUser, userProfile } = get();
								const newMessage = newRecord as CommentMessage;
								const isCurrentUser = newMessage.user_id === currentUser?.id;

								const enrichedMessage: CommentMessage = {
									...newMessage,
									user: isCurrentUser
										? {
												display_name:
													userProfile?.display_name ||
													currentUser?.email?.split('@')[0] ||
													'Anonymous',
												avatar_url: userProfile?.avatar_url,
												full_name: userProfile?.full_name,
											}
										: {
												display_name: 'User',
												avatar_url: undefined,
												full_name: undefined,
											},
									reactions: [],
								};

								set((state) => {
									const existingMessages = state.commentMessages[commentId] || [];
									// Prevent duplicates: only add if message doesn't already exist
									const exists = existingMessages.some((m) => m.id === newMessage.id);
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
