"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { Comment } from "@/types/comment-types";
import { cn } from "@/utils/cn";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Flag,
  MessageCircle,
  Paperclip,
  Reply,
  Search,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import { CommentThread } from "./comment-thread";

interface CommentsPanelProps {
  nodeId?: string;
  className?: string;
}

const CommentsPanelComponent = ({ nodeId, className }: CommentsPanelProps) => {
  const {
    selectedNodeId,
    mapId,
    popoverOpen,
    setPopoverOpen,
    allComments,
    commentsError,
    commentFilter,
    loadingStates,
    fetchCommentsWithFilters,
    addNodeComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,
    setCommentFilter,
    refreshComments,
    // Add these new methods to your store
    addCommentReaction,
    removeCommentReaction,
    getCurrentUser,
    currentUser,
  } = useAppStore(
    useShallow((state) => ({
      selectedNodeId: state.selectedNodeId,
      mapId: state.mapId,
      popoverOpen: state.popoverOpen,
      setPopoverOpen: state.setPopoverOpen,
      allComments: state.allComments,
      commentsError: state.commentsError,
      commentFilter: state.commentFilter,
      loadingStates: state.loadingStates,
      fetchCommentsWithFilters: state.fetchCommentsWithFilters,
      addNodeComment: state.addNodeComment,
      updateComment: state.updateComment,
      deleteComment: state.deleteComment,
      resolveComment: state.resolveComment,
      unresolveComment: state.unresolveComment,
      setCommentFilter: state.setCommentFilter,
      refreshComments: state.refreshComments,
      // These might need to be added to your store
      addCommentReaction: state.addCommentReaction || (() => Promise.resolve()),
      removeCommentReaction:
        state.removeCommentReaction || (() => Promise.resolve()),
      getCurrentUser: state.getCurrentUser,
      currentUser: state.currentUser,
    })),
  );

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [commentCategory, setCommentCategory] = useState<string>("note");
  const [commentPriority, setCommentPriority] = useState<string>("medium");
  const isLoadingComments = loadingStates.isLoadingComments;

  const targetNodeId = nodeId || selectedNodeId;
  const newCommentRef = useRef<HTMLTextAreaElement>(null);

  // Initial load when panel opens or target node changes
  useEffect(() => {
    if (popoverOpen.commentsPanel && targetNodeId) {
      fetchCommentsWithFilters({ nodeId: targetNodeId });
    } else if (popoverOpen.commentsPanel && !targetNodeId) {
      fetchCommentsWithFilters({ mapId: mapId || undefined });
    }
  }, [
    popoverOpen.commentsPanel,
    mapId,
    targetNodeId,
    fetchCommentsWithFilters,
  ]);

  const handleCreateComment = async () => {
    if (!newComment.trim() || !targetNodeId) return;

    try {
      await addNodeComment(
        targetNodeId,
        newComment.trim(),
        replyingTo || undefined,
        {
          category: commentCategory as any,
          priority: commentPriority as any,
        },
      );
      setNewComment("");
      setReplyingTo(null);
      toast.success("Comment added successfully!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    newCommentRef.current?.focus();
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, content);
      toast.success("Comment updated successfully!");
    } catch (error) {
      toast.error("Failed to update comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      toast.success("Comment deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      await resolveComment(commentId);
      toast.success("Comment resolved!");
    } catch (error) {
      toast.error("Failed to resolve comment");
    }
  };

  const handleUnresolve = async (commentId: string) => {
    try {
      await unresolveComment(commentId);
      toast.success("Comment unresolved!");
    } catch (error) {
      toast.error("Failed to unresolve comment");
    }
  };

  const handleAddReaction = async (commentId: string, emoji: string) => {
    try {
      await addCommentReaction(commentId, emoji);
    } catch (error) {
      toast.error("Failed to add reaction");
    }
  };

  const handleRemoveReaction = async (
    commentId: string,
    reactionId: string,
  ) => {
    try {
      await removeCommentReaction(commentId, reactionId);
    } catch (error) {
      toast.error("Failed to remove reaction");
    }
  };

  // Build root-level comment threads (comments without parent_comment_id)
  const rootComments = allComments.filter(
    (comment) => !comment.parent_comment_id,
  );

  // Filter threads based on search and filters
  const filteredRootComments = rootComments.filter((comment) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();

      const checkCommentAndReplies = (c: Comment): boolean => {
        if (
          c.content.toLowerCase().includes(searchLower) ||
          (c.author?.full_name || "").toLowerCase().includes(searchLower) ||
          (c.author?.display_name || "").toLowerCase().includes(searchLower)
        ) {
          return true;
        }

        const replies = allComments.filter(
          (reply) => reply.parent_comment_id === c.id,
        );
        return replies.some(checkCommentAndReplies);
      };

      if (!checkCommentAndReplies(comment)) return false;
    }

    // Apply other filters
    if (
      commentFilter.is_resolved !== undefined &&
      comment.is_resolved !== commentFilter.is_resolved
    ) {
      return false;
    }

    if (
      commentFilter.category &&
      comment.metadata?.category !== commentFilter.category
    ) {
      return false;
    }

    return true;
  });

  const totalComments = allComments.length;
  const unresolvedComments = allComments.filter((c) => !c.is_resolved).length;
  const highPriorityComments = allComments.filter(
    (c) => c.metadata?.priority === "high",
  ).length;

  const handleToggleCommentsPanel = () => {
    setPopoverOpen({ commentsPanel: !popoverOpen.commentsPanel });
  };

  if (!popoverOpen.commentsPanel) return null;

  return (
    <TooltipProvider>
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={cn(
            "fixed right-0 top-0 h-full w-96 bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col",
            className,
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 text-teal-400" />

              <h2 className="text-lg font-semibold text-zinc-100">Comments</h2>

              {totalComments > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalComments}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshComments()}
                    className="size-8 p-0"
                  >
                    <Clock className="size-4" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>Refresh comments</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleCommentsPanel}
                    className="size-8 p-0"
                  >
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent>Close panel</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Stats Bar */}
          {totalComments > 0 && (
            <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <AlertCircle className="size-3" />

                <span>{unresolvedComments} unresolved</span>
              </div>

              {highPriorityComments > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <Flag className="size-3" />

                  <span>{highPriorityComments} high priority</span>
                </div>
              )}
            </div>
          )}

          {/* Search and Filters */}
          <div className="p-4 space-y-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-zinc-400" />

              <Input
                placeholder="Search comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs"
              >
                <Filter className="size-3 mr-1" />
                Filters
                {showFilters ? (
                  <ChevronDown className="size-3 ml-1" />
                ) : (
                  <ChevronRight className="size-3 ml-1" />
                )}
              </Button>

              {/* Quick filter buttons */}
              <Button
                variant={
                  commentFilter.is_resolved === false ? "default" : "ghost"
                }
                size="sm"
                onClick={() =>
                  setCommentFilter({
                    ...commentFilter,
                    is_resolved:
                      commentFilter.is_resolved === false ? undefined : false,
                  })
                }
                className="text-xs"
              >
                Unresolved
              </Button>

              <Button
                variant={
                  commentFilter.is_resolved === true ? "default" : "ghost"
                }
                size="sm"
                onClick={() =>
                  setCommentFilter({
                    ...commentFilter,
                    is_resolved:
                      commentFilter.is_resolved === true ? undefined : true,
                  })
                }
                className="text-xs"
              >
                Resolved
              </Button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Select
                    value={commentFilter.category || "all"}
                    onValueChange={(value) =>
                      setCommentFilter({
                        ...commentFilter,
                        category: value === "all" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>

                      <SelectItem value="note">Note</SelectItem>

                      <SelectItem value="question">Question</SelectItem>

                      <SelectItem value="suggestion">Suggestion</SelectItem>

                      <SelectItem value="issue">Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingComments ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
              </div>
            ) : commentsError ? (
              <div className="p-4 text-center text-red-400">
                <AlertCircle className="size-8 mx-auto mb-2" />

                <p className="text-sm">{commentsError}</p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshComments()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredRootComments.length === 0 ? (
              <div className="p-4 text-center text-zinc-400">
                <MessageCircle className="size-8 mx-auto mb-2 opacity-50" />

                <p className="text-sm">
                  {searchQuery || Object.keys(commentFilter).length > 0
                    ? "No comments match your filters"
                    : "No comments yet"}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredRootComments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    allComments={allComments}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onResolve={handleResolve}
                    onUnresolve={handleUnresolve}
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* New Comment Form */}
          <div className="border-t border-zinc-800 p-4 space-y-3">
            {replyingTo && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Reply className="size-3" />

                <span>Replying to comment</span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="size-4 p-0 ml-auto"
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}

            <div className="flex gap-2 text-xs">
              <Select
                value={commentCategory}
                onValueChange={setCommentCategory}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>

                  <SelectItem value="question">Question</SelectItem>

                  <SelectItem value="suggestion">Suggestion</SelectItem>

                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={commentPriority}
                onValueChange={setCommentPriority}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>

                  <SelectItem value="medium">Medium</SelectItem>

                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  ref={newCommentRef}
                  placeholder={
                    replyingTo ? "Write a reply..." : "Add a comment..."
                  }
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px] resize-none bg-zinc-900 border-zinc-700"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleCreateComment();
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Button
                  onClick={handleCreateComment}
                  disabled={!newComment.trim() || !targetNodeId}
                  size="sm"
                  className="size-8 p-0"
                >
                  <Send className="size-4" />
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      disabled
                    >
                      <Paperclip className="size-4" />
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>Attach file (coming soon)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              Press Cmd/Ctrl + Enter to send
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
};

export const CommentsPanel = memo(CommentsPanelComponent);
