import withLoadingAndToast from "@/helpers/with-loading-and-toast";
import type {
  Comment,
  CommentFilter,
  CommentSort,
  MapComment,
  NodeComment,
  NodeCommentSummary,
} from "@/types/comment-types";
import type { StateCreator } from "zustand";
import type { AppState } from "../app-state";

// Add reaction types if they don't exist
interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface CurrentUser {
  id: string;
  email?: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface CommentsSlice {
  // Comments state
  nodeComments: Record<string, NodeComment[]>;
  mapComments: MapComment[];
  commentFilter: CommentFilter;
  commentSort: CommentSort;
  selectedCommentId: string | null;
  commentDrafts: Record<string, string>;
  isCommentsPanelOpen: boolean;
  selectedNodeId: string | null;

  // Enhanced state from hook
  allComments: Comment[];
  commentSummaries: Map<string, NodeCommentSummary>;
  commentsError: string | null;

  // Comments actions
  fetchNodeComments: (nodeId: string) => Promise<void>;
  fetchMapComments: () => Promise<void>;
  fetchCommentsWithFilters: (options?: {
    nodeId?: string;
    mapId?: string;
  }) => Promise<void>;
  addNodeComment: (
    nodeId: string,
    content: string,
    parentId?: string,
    metadata?: { category?: string; priority?: string },
  ) => Promise<void>;
  addMapComment: (
    content: string,
    position?: { x: number; y: number },
    parentId?: string,
  ) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  resolveComment: (commentId: string) => Promise<void>;
  unresolveComment: (commentId: string) => Promise<void>;
  setCommentFilter: (filter: Partial<CommentFilter>) => void;
  setCommentSort: (sort: CommentSort) => void;
  setSelectedComment: (commentId: string | null) => void;
  updateCommentDraft: (targetId: string, content: string) => void;
  clearCommentDraft: (targetId: string) => void;
  setCommentsPanelOpen: (isOpen: boolean) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  initializeComments: (mapId?: string) => Promise<void>;

  // Enhanced actions from hook
  refreshComments: () => Promise<void>;
  getNodeCommentCount: (nodeId: string) => number;
  getUnresolvedCommentCount: (nodeId: string) => number;
  hasUserComments: (nodeId: string) => boolean;
  setCommentsError: (error: string | null) => void;

  // NEW: Reaction methods
  addCommentReaction: (commentId: string, emoji: string) => Promise<void>;
  removeCommentReaction: (
    commentId: string,
    reactionId: string,
  ) => Promise<void>;

  // Real-time subscription management
  subscribeToComments: (mapId?: string, nodeId?: string) => void;
  unsubscribeFromComments: () => void;

  // Private subscription reference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _commentsSubscription: any;
}

export const createCommentsSlice: StateCreator<
  AppState,
  [],
  [],
  CommentsSlice
> = (set, get) => ({
  // Initial state
  nodeComments: {},
  mapComments: [],
  commentFilter: {},
  commentSort: { field: "created_at", direction: "desc" },
  selectedCommentId: null,
  commentDrafts: {},
  isCommentsPanelOpen: false,
  selectedNodeId: null,
  allComments: [],
  commentSummaries: new Map(),
  commentsError: null,
  currentUser: null,

  // Private subscription reference
  _commentsSubscription: null,

  // Enhanced fetch with filtering and sorting (from hook)
  fetchCommentsWithFilters: withLoadingAndToast(
    async (options: { nodeId?: string; mapId?: string } = {}) => {
      const { supabase, mapId: storeMapId, commentFilter, commentSort } = get();
      const targetMapId = options.mapId || storeMapId;

      if (!targetMapId) {
        throw new Error("Map ID is required");
      }

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
        ),
        reactions:comment_reactions(
          id,
          user_id,
          emoji,
          created_at
        )
      `);

      // Apply filters
      if (options.nodeId) {
        query = query.eq("node_id", options.nodeId);
      }

      query = query.eq("map_id", targetMapId);

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
        reactions: comment.reactions || [],
      })) as NodeComment[];

      // Update summaries
      const summaries = new Map<string, NodeCommentSummary>();
      commentsData.forEach((comment) => {
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

      set({
        allComments: commentsData,
        commentSummaries: summaries,
        commentsError: null,
      });

      // Also update nodeComments for specific node
      if (options.nodeId) {
        const nodeComments = commentsData.filter(
          (c) => c.node_id === options.nodeId,
        );
        set((state) => ({
          nodeComments: {
            ...state.nodeComments,
            [options.nodeId!]: nodeComments,
          },
        }));
      }
    },
    "isLoadingComments",
    {
      initialMessage: "Loading comments...",
      successMessage: "Comments loaded successfully",
      errorMessage: "Failed to load comments",
    },
  ),

  fetchNodeComments: withLoadingAndToast(
    async (nodeId: string) => {
      const { supabase, mapId } = get();

      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const { data: comments, error } = await supabase
        .from("node_comments")
        .select("*")
        .eq("node_id", nodeId)
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      set((state) => ({
        nodeComments: {
          ...state.nodeComments,
          [nodeId]: comments || [],
        },
      }));
    },
    "isLoadingComments",
    {
      initialMessage: "Loading comments...",
      successMessage: "Comments loaded successfully",
      errorMessage: "Failed to load comments",
    },
  ),

  fetchMapComments: withLoadingAndToast(
    async () => {
      const { supabase, mapId } = get();

      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const { data: comments, error } = await supabase
        .from("map_comments")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      set({ mapComments: comments || [] });
    },
    "isLoadingComments",
    {
      initialMessage: "Loading map comments...",
      successMessage: "Map comments loaded successfully",
      errorMessage: "Failed to load map comments",
    },
  ),

  addNodeComment: withLoadingAndToast(
    async (
      nodeId: string,
      content: string,
      parentId?: string,
      metadata?: { category?: string; priority?: string },
    ) => {
      const { supabase, mapId, clearCommentDraft } = get();

      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const user = await supabase.auth.getUser();

      if (!user.data.user) {
        throw new Error("User not authenticated");
      }

      const { data: comment, error } = await supabase
        .from("node_comments")
        .insert({
          node_id: nodeId,
          map_id: mapId,
          content,
          author_id: user.data.user.id,
          parent_comment_id: parentId,
          metadata: metadata || {},
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      set((state) => ({
        nodeComments: {
          ...state.nodeComments,
          [nodeId]: [...(state.nodeComments[nodeId] || []), comment],
        },
      }));

      // Clear draft
      clearCommentDraft(nodeId);

      // Refresh to get updated data with relations
      await get().refreshComments();
    },
    "isSavingComment",
    {
      initialMessage: "Adding comment...",
      successMessage: "Comment added successfully",
      errorMessage: "Failed to add comment",
    },
  ),

  addMapComment: withLoadingAndToast(
    async (
      content: string,
      position?: { x: number; y: number },
      parentId?: string,
    ) => {
      const { supabase, mapId } = get();

      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const user = await supabase.auth.getUser();

      if (!user.data.user) {
        throw new Error("User not authenticated");
      }

      const { data: comment, error } = await supabase
        .from("map_comments")
        .insert({
          map_id: mapId,
          content,
          author_id: user.data.user.id,
          parent_comment_id: parentId,
          position,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      set((state) => ({
        mapComments: [...state.mapComments, comment],
      }));

      // Clear draft
      get().clearCommentDraft(mapId);
    },
    "isSavingComment",
    {
      initialMessage: "Adding map comment...",
      successMessage: "Map comment added successfully",
      errorMessage: "Failed to add map comment",
    },
  ),

  updateComment: withLoadingAndToast(
    async (commentId: string, content: string) => {
      const { supabase } = get();

      const { data: comment, error } = await supabase
        .from("node_comments")
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Refresh to get updated data
      await get().refreshComments();
    },
    "isSavingComment",
    {
      initialMessage: "Updating comment...",
      successMessage: "Comment updated successfully",
      errorMessage: "Failed to update comment",
    },
  ),

  deleteComment: withLoadingAndToast(
    async (commentId: string) => {
      const { supabase } = get();

      const { error } = await supabase
        .from("node_comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state and refresh
      set((state) => ({
        selectedCommentId:
          state.selectedCommentId === commentId
            ? null
            : state.selectedCommentId,
      }));

      await get().refreshComments();
    },
    "isDeletingComment",
    {
      initialMessage: "Deleting comment...",
      successMessage: "Comment deleted successfully",
      errorMessage: "Failed to delete comment",
    },
  ),

  resolveComment: withLoadingAndToast(
    async (commentId: string) => {
      const { supabase } = get();

      const user = await supabase.auth.getUser();

      if (!user.data.user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("node_comments")
        .update({
          is_resolved: true,
          resolved_by: user.data.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh to get updated data
      await get().refreshComments();
    },
    "isSavingComment",
    {
      initialMessage: "Resolving comment...",
      successMessage: "Comment resolved successfully",
      errorMessage: "Failed to resolve comment",
    },
  ),

  unresolveComment: withLoadingAndToast(
    async (commentId: string) => {
      const { supabase } = get();

      const { error } = await supabase
        .from("node_comments")
        .update({
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
        })
        .eq("id", commentId);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh to get updated data
      await get().refreshComments();
    },
    "isSavingComment",
    {
      initialMessage: "Unresolving comment...",
      successMessage: "Comment unresolved successfully",
      errorMessage: "Failed to unresolve comment",
    },
  ),

  // NEW: Add comment reaction
  addCommentReaction: withLoadingAndToast(
    async (commentId: string, emoji: string) => {
      const { supabase, currentUser } = get();

      if (!currentUser) {
        throw new Error("User not logged in");
      }

      const { error } = await supabase.from("comment_reactions").insert({
        comment_id: commentId,
        user_id: currentUser.id,
        emoji,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Refresh comments to get updated reactions
      await get().refreshComments();
    },
    "isSavingComment",
    {
      initialMessage: "Adding reaction...",
      successMessage: "Reaction added successfully",
      errorMessage: "Failed to add reaction",
    },
  ),

  // NEW: Remove comment reaction
  removeCommentReaction: withLoadingAndToast(
    async (commentId: string, reactionId: string) => {
      const { supabase } = get();

      const { error } = await supabase
        .from("comment_reactions")
        .delete()
        .eq("id", reactionId);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh comments to get updated reactions
      await get().refreshComments();
    },
    "isSavingComment",
    {
      initialMessage: "Removing reaction...",
      successMessage: "Reaction removed successfully",
      errorMessage: "Failed to remove reaction",
    },
  ),

  setCommentFilter: (filter: Partial<CommentFilter>) => {
    set((state) => ({
      commentFilter: { ...state.commentFilter, ...filter },
    }));
    // Automatically refresh with new filter
    get().refreshComments();
  },

  setCommentSort: (sort: CommentSort) => {
    set({ commentSort: sort });
    // Automatically refresh with new sort
    get().refreshComments();
  },

  setSelectedComment: (commentId: string | null) => {
    set({ selectedCommentId: commentId });
  },

  updateCommentDraft: (targetId: string, content: string) => {
    set((state) => ({
      commentDrafts: {
        ...state.commentDrafts,
        [targetId]: content,
      },
    }));
  },

  clearCommentDraft: (targetId: string) => {
    set((state) => {
      const newDrafts = { ...state.commentDrafts };
      delete newDrafts[targetId];
      return { commentDrafts: newDrafts };
    });
  },

  setCommentsPanelOpen: (isOpen: boolean) => {
    set({ isCommentsPanelOpen: isOpen });
  },

  setSelectedNodeId: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  // Enhanced utility functions from hook
  refreshComments: async () => {
    const { selectedNodeId, mapId } = get();
    await get().fetchCommentsWithFilters({
      nodeId: selectedNodeId || undefined,
      mapId: mapId === null ? undefined : mapId,
    });
  },

  getNodeCommentCount: (nodeId: string): number => {
    const { commentSummaries } = get();
    return commentSummaries.get(nodeId)?.comment_count || 0;
  },

  // New initialization method
  initializeComments: withLoadingAndToast(
    async (mapId?: string) => {
      const targetMapId = mapId || get().mapId;

      if (!targetMapId) {
        throw new Error("Map ID is required for comments initialization");
      }

      // Fetch initial comments data
      await get().fetchCommentsWithFilters({ mapId: targetMapId });

      // Set up real-time subscription
      get().subscribeToComments(targetMapId);

      // Reset any previous error state
      get().setCommentsError(null);
    },
    "isLoadingComments",
    {
      initialMessage: "Initializing comments...",
      successMessage: "Comments initialized successfully",
      errorMessage: "Failed to initialize comments",
    },
  ),

  getUnresolvedCommentCount: (nodeId: string): number => {
    const { commentSummaries } = get();
    return commentSummaries.get(nodeId)?.unresolved_count || 0;
  },

  hasUserComments: (nodeId: string): boolean => {
    const { commentSummaries } = get();
    return commentSummaries.get(nodeId)?.has_user_comments || false;
  },

  setCommentsError: (error: string | null) => {
    set({ commentsError: error });
  },

  // Real-time subscription management
  subscribeToComments: (mapId?: string, nodeId?: string) => {
    const { supabase } = get();
    const targetMapId = mapId || get().mapId;

    if (!targetMapId && !nodeId) return;

    // Unsubscribe from existing subscription
    get().unsubscribeFromComments();

    const channel = supabase
      .channel("comments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "node_comments",
          filter: targetMapId
            ? `map_id=eq.${targetMapId}`
            : `node_id=eq.${nodeId}`,
        },
        () => {
          // Refresh comments when changes occur
          get().refreshComments();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_reactions",
        },
        () => {
          // Refresh comments when reactions change
          get().refreshComments();
        },
      )
      .subscribe();

    // Store subscription reference
    set({ _commentsSubscription: channel });
  },

  unsubscribeFromComments: () => {
    const { supabase, _commentsSubscription } = get();

    if (_commentsSubscription) {
      supabase.removeChannel(_commentsSubscription);
      set({ _commentsSubscription: null });
    }
  },
});
