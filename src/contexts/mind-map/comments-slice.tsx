//WIP
// Add to your main store interface
interface CommentsState {
  // Core data
  comments: NodeComment[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Filters & sorting
  commentFilter: CommentFilter;
  commentSort: CommentSort;

  // WebSocket channel reference
  commentsChannel: RealtimeChannel | null;
}

// Add to store initial state
const initialCommentsState: CommentsState = {
  comments: [],
  isLoading: false,
  error: null,
  commentFilter: {},
  commentSort: {
    field: "created_at",
    direction: "desc",
  },
  commentsChannel: null,
};

// Store actions (add to your main store)
interface CommentsActions {
  // Data operations
  loadComments: (options?: {
    nodeId?: string;
    mapId?: string;
  }) => Promise<void>;
  createComment: (
    content: string,
    nodeId?: string,
    parentId?: string,
  ) => Promise<NodeComment | null>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  resolveComment: (commentId: string) => Promise<boolean>;
  unresolveComment: (commentId: string) => Promise<boolean>;

  // Filtering & sorting
  setCommentFilter: (filter: Partial<CommentFilter>) => void;
  setCommentSort: (sort: CommentSort) => void;

  // Utilities
  refreshComments: () => Promise<void>;
  getNodeCommentCount: (nodeId: string) => number;
  getUnresolvedCommentCount: (nodeId: string) => number;
  hasUserComments: (nodeId: string) => boolean;

  // WebSocket management
  subscribeToComments: (mapId?: string, nodeId?: string) => void;
  unsubscribeFromComments: () => void;

  // Computed selectors
  getCommentSummaries: () => Map<string, NodeCommentSummary>;
  getFilteredComments: () => NodeComment[];
}

// Implementation of actions
const commentsActions: CommentsActions = {
  loadComments: withLoadingAndToast(
    async (options: { nodeId?: string; mapId?: string } = {}) => {
      const { supabase, commentFilter, commentSort } = get();

      try {
        let query = supabase.from("node_comments").select(`
            *,
            author:user_profiles!author_id(
              id,
              user_id,
              full_name,
              display_name,
              avatar_url
            ),
            resolved_by_user:user_profiles!resolved_by(
              id,
              user_id,
              full_name,
              display_name,
              avatar_url
            )
          `);

        // Apply filters
        if (options.nodeId) {
          query = query.eq("node_id", options.nodeId);
        }

        if (options.mapId) {
          query = query.eq("map_id", options.mapId);
        }

        if (commentFilter.is_resolved !== undefined) {
          query = query.eq("is_resolved", commentFilter.is_resolved);
        }

        if (commentFilter.author_id) {
          query = query.eq("author_id", commentFilter.author_id);
        }

        if (commentFilter.category) {
          query = query.eq("metadata->>category", commentFilter.category);
        }

        if (commentFilter.search_text) {
          query = query.ilike("content", `%${commentFilter.search_text}%`);
        }

        // Apply sorting
        const orderColumn =
          commentSort.field === "author_name" ? "author_id" : commentSort.field;
        query = query.order(orderColumn, {
          ascending: commentSort.direction === "asc",
        });

        const { data, error } = await query;

        if (error) {
          throw new Error(error.message);
        }

        const commentsData = (data || []).map((comment) => ({
          ...comment,
          author: comment.author
            ? {
                id: comment.author.user_id,
                full_name: comment.author.full_name,
                display_name: comment.author.display_name,
                avatar_url: comment.author.avatar_url,
              }
            : null,
          resolved_by_user: comment.resolved_by_user
            ? {
                id: comment.resolved_by_user.user_id,
                full_name: comment.resolved_by_user.full_name,
                display_name: comment.resolved_by_user.display_name,
                avatar_url: comment.resolved_by_user.avatar_url,
              }
            : null,
        })) as NodeComment[];

        set({ comments: commentsData });
      } catch (error) {
        console.error("Failed to load comments:", error);
        throw error;
      }
    },
    "isLoading",
    {
      initialMessage: "Loading comments...",
      errorMessage: "Failed to load comments.",
    },
  ),

  createComment: withLoadingAndToast(
    async (
      content: string,
      nodeId?: string,
      parentId?: string,
    ): Promise<NodeComment | null> => {
      const { supabase, mapId, comments } = get();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Create optimistic comment
        const optimisticComment: NodeComment = {
          id: `temp-${Date.now()}`, // Temporary ID
          content,
          node_id: nodeId || "",
          map_id: mapId || "",
          author_id: user.id,
          parent_comment_id: parentId || null,
          is_resolved: false,
          is_edited: false,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          edited_at: null,
          resolved_at: null,
          resolved_by: null,
          author: null, // Will be populated from DB
          resolved_by_user: null,
        };

        // Optimistic update
        set((state) => ({
          comments: [...state.comments, optimisticComment],
        }));

        // Make API call
        const { data, error } = await supabase
          .from("node_comments")
          .insert({
            content,
            node_id: nodeId,
            map_id: mapId,
            author_id: user.id,
            parent_comment_id: parentId,
          })
          .select(
            `
            *,
            author:user_profiles!author_id(
              id,
              user_id,
              full_name,
              display_name,
              avatar_url
            )
          `,
          )
          .single();

        if (error) {
          // Revert optimistic update
          set({ comments });
          throw new Error(error.message);
        }

        const newComment = {
          ...data,
          author: data.author
            ? {
                id: data.author.user_id,
                full_name: data.author.full_name,
                display_name: data.author.display_name,
                avatar_url: data.author.avatar_url,
              }
            : null,
        } as NodeComment;

        // Replace optimistic comment with real one
        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === optimisticComment.id ? newComment : c,
          ),
        }));

        return newComment;
      } catch (error) {
        // Revert optimistic update on error
        set({ comments });
        console.error("Failed to create comment:", error);
        throw error;
      }
    },
    "isLoading",
    {
      initialMessage: "Creating comment...",
      successMessage: "Comment created successfully.",
      errorMessage: "Failed to create comment.",
    },
  ),

  updateComment: withLoadingAndToast(
    async (commentId: string, content: string): Promise<boolean> => {
      const { supabase, comments } = get();

      // Store original state for rollback
      const originalComments = [...comments];

      try {
        // Optimistic update
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  content,
                  is_edited: true,
                  edited_at: new Date().toISOString(),
                }
              : comment,
          ),
        }));

        const { error } = await supabase
          .from("node_comments")
          .update({
            content,
            is_edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq("id", commentId);

        if (error) {
          // Revert optimistic update
          set({ comments: originalComments });
          throw new Error(error.message);
        }

        return true;
      } catch (error) {
        // Revert optimistic update on error
        set({ comments: originalComments });
        console.error("Failed to update comment:", error);
        throw error;
      }
    },
    "isLoading",
    {
      initialMessage: "Updating comment...",
      successMessage: "Comment updated successfully.",
      errorMessage: "Failed to update comment.",
    },
  ),

  deleteComment: withLoadingAndToast(
    async (commentId: string): Promise<boolean> => {
      const { supabase, comments } = get();

      // Store original state for rollback
      const originalComments = [...comments];

      try {
        // Optimistic update - remove comment
        set((state) => ({
          comments: state.comments.filter(
            (comment) => comment.id !== commentId,
          ),
        }));

        const { error } = await supabase
          .from("node_comments")
          .delete()
          .eq("id", commentId);

        if (error) {
          // Revert optimistic update
          set({ comments: originalComments });
          throw new Error(error.message);
        }

        return true;
      } catch (error) {
        // Revert optimistic update on error
        set({ comments: originalComments });
        console.error("Failed to delete comment:", error);
        throw error;
      }
    },
    "isLoading",
    {
      initialMessage: "Deleting comment...",
      successMessage: "Comment deleted successfully.",
      errorMessage: "Failed to delete comment.",
    },
  ),

  resolveComment: withLoadingAndToast(
    async (commentId: string): Promise<boolean> => {
      const { supabase, comments } = get();

      // Store original state for rollback
      const originalComments = [...comments];

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Optimistic update
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  is_resolved: true,
                  resolved_by: user.id,
                  resolved_at: new Date().toISOString(),
                }
              : comment,
          ),
        }));

        const { error } = await supabase
          .from("node_comments")
          .update({
            is_resolved: true,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", commentId);

        if (error) {
          // Revert optimistic update
          set({ comments: originalComments });
          throw new Error(error.message);
        }

        return true;
      } catch (error) {
        // Revert optimistic update on error
        set({ comments: originalComments });
        console.error("Failed to resolve comment:", error);
        throw error;
      }
    },
    "isLoading",
    {
      initialMessage: "Resolving comment...",
      successMessage: "Comment resolved successfully.",
      errorMessage: "Failed to resolve comment.",
    },
  ),

  unresolveComment: withLoadingAndToast(
    async (commentId: string): Promise<boolean> => {
      const { supabase, comments } = get();

      // Store original state for rollback
      const originalComments = [...comments];

      try {
        // Optimistic update
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  is_resolved: false,
                  resolved_by: null,
                  resolved_at: null,
                }
              : comment,
          ),
        }));

        const { error } = await supabase
          .from("node_comments")
          .update({
            is_resolved: false,
            resolved_by: null,
            resolved_at: null,
          })
          .eq("id", commentId);

        if (error) {
          // Revert optimistic update
          set({ comments: originalComments });
          throw new Error(error.message);
        }

        return true;
      } catch (error) {
        // Revert optimistic update on error
        set({ comments: originalComments });
        console.error("Failed to unresolve comment:", error);
        throw error;
      }
    },
    "isLoading",
    {
      initialMessage: "Unresolving comment...",
      successMessage: "Comment unresolved successfully.",
      errorMessage: "Failed to unresolve comment.",
    },
  ),

  setCommentFilter: (filter: Partial<CommentFilter>) => {
    set((state) => ({
      commentFilter: { ...state.commentFilter, ...filter },
    }));
  },

  setCommentSort: (sort: CommentSort) => {
    set({ commentSort: sort });
  },

  refreshComments: async () => {
    const { loadComments, mapId } = get();
    await loadComments({ mapId });
  },

  getNodeCommentCount: (nodeId: string): number => {
    const { getCommentSummaries } = get();
    return getCommentSummaries().get(nodeId)?.comment_count || 0;
  },

  getUnresolvedCommentCount: (nodeId: string): number => {
    const { getCommentSummaries } = get();
    return getCommentSummaries().get(nodeId)?.unresolved_count || 0;
  },

  hasUserComments: (nodeId: string): boolean => {
    const { getCommentSummaries } = get();
    return getCommentSummaries().get(nodeId)?.has_user_comments || false;
  },

  subscribeToComments: (mapId?: string, nodeId?: string) => {
    const { supabase, loadComments, unsubscribeFromComments } = get();

    // Clean up existing subscription
    unsubscribeFromComments();

    if (!mapId && !nodeId) return;

    const channel = supabase
      .channel("comments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "node_comments",
          filter: mapId ? `map_id=eq.${mapId}` : `node_id=eq.${nodeId}`,
        },
        () => {
          // Refresh comments when changes occur
          loadComments({ mapId, nodeId });
        },
      )
      .subscribe();

    set({ commentsChannel: channel });
  },

  unsubscribeFromComments: () => {
    const { supabase, commentsChannel } = get();

    if (commentsChannel) {
      supabase.removeChannel(commentsChannel);
      set({ commentsChannel: null });
    }
  },

  // Computed selectors
  getCommentSummaries: (): Map<string, NodeCommentSummary> => {
    const { comments } = get();
    const summaries = new Map<string, NodeCommentSummary>();

    comments.forEach((comment) => {
      const nodeId = comment.node_id;
      const existing = summaries.get(nodeId);

      if (existing) {
        existing.comment_count += 1;

        if (!comment.is_resolved) {
          existing.unresolved_count += 1;
        }

        if (comment.created_at > (existing.last_comment_at || "")) {
          existing.last_comment_at = comment.created_at;
        }
      } else {
        summaries.set(nodeId, {
          node_id: nodeId,
          comment_count: 1,
          unresolved_count: comment.is_resolved ? 0 : 1,
          last_comment_at: comment.created_at,
          has_user_comments: true, // TODO: Check if current user has comments
        });
      }
    });

    return summaries;
  },

  getFilteredComments: (): NodeComment[] => {
    const { comments, commentFilter, commentSort } = get();

    let filtered = [...comments];

    // Apply filters (client-side filtering for real-time updates)
    if (commentFilter.is_resolved !== undefined) {
      filtered = filtered.filter(
        (c) => c.is_resolved === commentFilter.is_resolved,
      );
    }

    if (commentFilter.author_id) {
      filtered = filtered.filter(
        (c) => c.author_id === commentFilter.author_id,
      );
    }

    if (commentFilter.search_text) {
      filtered = filtered.filter((c) =>
        c.content
          .toLowerCase()
          .includes(commentFilter.search_text!.toLowerCase()),
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[commentSort.field as keyof NodeComment];
      let bVal: any = b[commentSort.field as keyof NodeComment];

      if (commentSort.field === "author_name") {
        aVal = a.author?.display_name || a.author?.full_name || "";
        bVal = b.author?.display_name || b.author?.full_name || "";
      }

      if (aVal < bVal) return commentSort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return commentSort.direction === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  },
};
