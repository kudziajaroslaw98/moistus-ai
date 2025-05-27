import withLoadingAndToast from "@/helpers/with-loading-and-toast";
import type { CommentFilter, CommentSort } from "@/types/comment-types";
import { create } from "zustand";
import type { AppState } from "./app-state";
import { createClipboardSlice } from "./slices/clipboard-slice";
import { createCoreDataSlice } from "./slices/core-slice";
import { createEdgeSlice } from "./slices/edges-slice";
import { createGroupsSlice } from "./slices/groups-slice";
import { createHistorySlice } from "./slices/history-slice";
import { createLoadingStateSlice } from "./slices/loading-state-slice";
import { createNodeSlice } from "./slices/nodes-slice";
import { createUiStateSlice } from "./slices/ui-slice";

// Configuration for debounce timing
const SAVE_DEBOUNCE_MS = 800;

// Helper HOF for handling loading states and toasts

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useAppStore = create<AppState>((set, get) => ({
  ...createCoreDataSlice(set, get),
  ...createNodeSlice(set, get),
  ...createEdgeSlice(set, get),
  ...createClipboardSlice(set, get),
  ...createUiStateSlice(set, get),
  ...createLoadingStateSlice(set, get),
  ...createHistorySlice(set, get),
  ...createLayoutSlice(set, get),
  ...createGroupsSlice(set, get),

  // Layout state

  // Comments state
  nodeComments: {},
  mapComments: [],
  commentFilter: {},
  commentSort: { field: "created_at", direction: "desc" },
  selectedCommentId: null,
  commentDrafts: {},
  // --- History state ---

  canUndo: false,
  canRedo: false,
  setCanUndo: (value: boolean) => set({ canUndo: value }),
  setCanRedo: (value: boolean) => set({ canRedo: value }),

  // --- History actions ---

  isCommentsPanelOpen: false,
  selectedNodeId: null,

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
    async (nodeId: string, content: string, parentId?: string) => {
      const { supabase, mapId } = get();

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
      get().clearCommentDraft(nodeId);
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
        .from("comments")
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

      // Update local state
      set((state) => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach((nodeId) => {
          newNodeComments[nodeId] = newNodeComments[nodeId].map((c) =>
            c.id === commentId ? { ...c, ...comment } : c,
          );
        });

        const newMapComments = state.mapComments.map((c) =>
          c.id === commentId ? { ...c, ...comment } : c,
        );

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments,
        };
      });
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
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      set((state) => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach((nodeId) => {
          newNodeComments[nodeId] = newNodeComments[nodeId].filter(
            (c) => c.id !== commentId,
          );
        });

        const newMapComments = state.mapComments.filter(
          (c) => c.id !== commentId,
        );

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments,
          selectedCommentId:
            state.selectedCommentId === commentId
              ? null
              : state.selectedCommentId,
        };
      });
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

      const { data: comment, error } = await supabase
        .from("comments")
        .update({
          is_resolved: true,
          resolved_by: user.data.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      set((state) => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach((nodeId) => {
          newNodeComments[nodeId] = newNodeComments[nodeId].map((c) =>
            c.id === commentId ? { ...c, ...comment } : c,
          );
        });

        const newMapComments = state.mapComments.map((c) =>
          c.id === commentId ? { ...c, ...comment } : c,
        );

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments,
        };
      });
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

      const { data: comment, error } = await supabase
        .from("comments")
        .update({
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      set((state) => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach((nodeId) => {
          newNodeComments[nodeId] = newNodeComments[nodeId].map((c) =>
            c.id === commentId ? { ...c, ...comment } : c,
          );
        });

        const newMapComments = state.mapComments.map((c) =>
          c.id === commentId ? { ...c, ...comment } : c,
        );

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments,
        };
      });
    },
    "isSavingComment",
    {
      initialMessage: "Unresolving comment...",
      successMessage: "Comment unresolved successfully",
      errorMessage: "Failed to unresolve comment",
    },
  ),

  setCommentFilter: (filter: CommentFilter) => {
    set({ commentFilter: filter });
  },

  setCommentSort: (sort: CommentSort) => {
    set({ commentSort: sort });
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
}));

export default useAppStore;
