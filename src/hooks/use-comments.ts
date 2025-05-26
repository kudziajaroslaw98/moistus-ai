"use client";

import useAppStore from "@/contexts/mind-map/mind-map-store";
import { createClient } from "@/helpers/supabase/client";
import {
  Comment,
  CommentFilter,
  CommentSort,
  NodeComment,
  NodeCommentSummary,
} from "@/types/comment-types";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UseCommentsOptions {
  nodeId?: string;
  mapId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCommentsReturn {
  comments: Comment[];
  nodeComments: NodeComment[];
  commentSummaries: Map<string, NodeCommentSummary>;
  isLoading: boolean;
  error: string | null;

  // Operations
  createComment: (
    content: string,
    nodeId?: string,
    parentId?: string,
  ) => Promise<Comment | null>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  resolveComment: (commentId: string) => Promise<boolean>;
  unresolveComment: (commentId: string) => Promise<boolean>;

  // Filtering and sorting
  filter: CommentFilter;
  setFilter: (filter: Partial<CommentFilter>) => void;
  sort: CommentSort;
  setSort: (sort: CommentSort) => void;

  // Utilities
  refresh: () => Promise<void>;
  getNodeCommentCount: (nodeId: string) => number;
  getUnresolvedCommentCount: (nodeId: string) => number;
  hasUserComments: (nodeId: string) => boolean;
}

export function useComments(
  options: UseCommentsOptions = {},
): UseCommentsReturn {
  const { nodeId, autoRefresh = false, refreshInterval = 30000 } = options;

  const mapId = useAppStore((state) => state.mapId);
  const [comments, setComments] = useState<Comment[]>([]);
  const [nodeComments, setNodeComments] = useState<NodeComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const [filter, setFilterState] = useState<CommentFilter>({});
  const [sort, setSortState] = useState<CommentSort>({
    field: "created_at",
    direction: "desc",
  });

  // Create comment summaries map
  const commentSummaries = useMemo(() => {
    const summaries = new Map<string, NodeCommentSummary>();

    nodeComments.forEach((comment) => {
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
  }, [nodeComments]);

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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
      if (nodeId) {
        query = query.eq("node_id", nodeId);
      }

      if (mapId) {
        query = query.eq("map_id", mapId);
      }

      if (filter.is_resolved !== undefined) {
        query = query.eq("is_resolved", filter.is_resolved);
      }

      if (filter.author_id) {
        query = query.eq("author_id", filter.author_id);
      }

      if (filter.category) {
        query = query.eq("metadata->>category", filter.category);
      }

      if (filter.search_text) {
        query = query.ilike("content", `%${filter.search_text}%`);
      }

      // Apply sorting
      const orderColumn =
        sort.field === "author_name" ? "author_id" : sort.field;
      query = query.order(orderColumn, { ascending: sort.direction === "asc" });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
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

      setComments(commentsData);
      setNodeComments(commentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, mapId, filter, sort, supabase]);

  const createComment = useCallback(
    async (
      content: string,
      targetNodeId?: string,
      parentId?: string,
    ): Promise<Comment | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        const { data, error } = await supabase
          .from("node_comments")
          .insert({
            content,
            node_id: targetNodeId || nodeId,
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

        // Update local state
        setNodeComments((prev) => [...prev, newComment]);
        await loadComments(); // Refresh to apply filters

        return newComment;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create comment",
        );
        return null;
      }
    },
    [nodeId, mapId, loadComments, supabase],
  );

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("node_comments")
          .update({
            content,
            is_edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq("id", commentId);

        if (error) {
          throw new Error(error.message);
        }

        await loadComments();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update comment",
        );
        return false;
      }
    },
    [loadComments, supabase],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("node_comments")
          .delete()
          .eq("id", commentId);

        if (error) {
          throw new Error(error.message);
        }

        await loadComments();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete comment",
        );
        return false;
      }
    },
    [loadComments, supabase],
  );

  const resolveComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        const { error } = await supabase
          .from("node_comments")
          .update({
            is_resolved: true,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", commentId);

        if (error) {
          throw new Error(error.message);
        }

        await loadComments();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to resolve comment",
        );
        return false;
      }
    },
    [loadComments, supabase],
  );

  const unresolveComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
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

        await loadComments();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to unresolve comment",
        );
        return false;
      }
    },
    [loadComments, supabase],
  );

  const setFilter = useCallback((newFilter: Partial<CommentFilter>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const setSort = useCallback((newSort: CommentSort) => {
    setSortState(newSort);
  }, []);

  const getNodeCommentCount = useCallback(
    (nodeId: string): number => {
      return commentSummaries.get(nodeId)?.comment_count || 0;
    },
    [commentSummaries],
  );

  const getUnresolvedCommentCount = useCallback(
    (nodeId: string): number => {
      return commentSummaries.get(nodeId)?.unresolved_count || 0;
    },
    [commentSummaries],
  );

  const hasUserComments = useCallback(
    (nodeId: string): boolean => {
      return commentSummaries.get(nodeId)?.has_user_comments || false;
    },
    [commentSummaries],
  );

  const refresh = useCallback(async () => {
    await loadComments();
  }, [loadComments]);

  // Load comments on mount and when dependencies change
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // // Auto-refresh if enabled
  // useEffect(() => {
  //   if (!autoRefresh) return;

  //   const interval = setInterval(loadComments, refreshInterval);
  //   return () => clearInterval(interval);
  // }, [autoRefresh, refreshInterval, loadComments]);

  // Set up real-time subscription for comments
  useEffect(() => {
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
          loadComments();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mapId, nodeId, loadComments, supabase]);

  return {
    comments,
    nodeComments,
    commentSummaries,
    isLoading,
    error,

    createComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,

    filter,
    setFilter,
    sort,
    setSort,

    refresh,
    getNodeCommentCount,
    getUnresolvedCommentCount,
    hasUserComments,
  };
}
