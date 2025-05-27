"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { Comment } from "@/types/comment-types";
import { cn } from "@/utils/cn";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Reply,
  Search,
  Send,
  Trash,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
  onUnresolve?: (commentId: string) => void;
}

function CommentItem({
  comment,
  isReply = false,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onUnresolve,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const displayName =
    comment.author?.display_name || comment.author?.full_name || "Anonymous";

  return (
    <div
      className={cn(
        "group relative",
        isReply && "ml-8 border-l-2 border-zinc-700 pl-4 mt-2",
      )}
    >
      <div
        className={cn(
          "p-3 rounded-lg border transition-all",
          comment.is_resolved
            ? "bg-green-950/20 border-green-800/30"
            : "bg-zinc-900/50 border-zinc-700",
          "hover:border-zinc-600",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={
                comment.author
                  ? {
                      id: comment.author.id,
                      user_id: comment.author.id,
                      full_name: comment.author.full_name,
                      display_name: comment.author.display_name,
                      avatar_url: comment.author.avatar_url,
                      created_at: "",
                    }
                  : null
              }
              size="sm"
              showTooltip
            />

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200">
                  {displayName}
                </span>

                {comment.is_resolved && (
                  <CheckCircle className="size-3 text-green-400" />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="size-3" />

                <span>{formatTimeAgo(comment.created_at)}</span>

                {comment.is_edited && <span className="italic">(edited)</span>}
              </div>
            </div>
          </div>

          <Popover open={showActions} onOpenChange={setShowActions}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-3" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-40 p-1 bg-zinc-950 border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  setShowActions(false);
                }}
                className="w-full justify-start gap-2 text-xs"
              >
                <Pencil className="size-3" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onReply?.(comment.id);
                  setShowActions(false);
                }}
                className="w-full justify-start gap-2 text-xs"
              >
                <Reply className="size-3" />
                Reply
              </Button>

              {comment.is_resolved ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onUnresolve?.(comment.id);
                    setShowActions(false);
                  }}
                  className="w-full justify-start gap-2 text-xs"
                >
                  <X className="size-3" />
                  Unresolve
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onResolve?.(comment.id);
                    setShowActions(false);
                  }}
                  className="w-full justify-start gap-2 text-xs"
                >
                  <Check className="size-3" />
                  Resolve
                </Button>
              )}

              <Separator className="my-1 bg-zinc-800" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDelete?.(comment.id);
                  setShowActions(false);
                }}
                className="w-full justify-start gap-2 text-xs text-red-400 hover:text-red-300"
              >
                <Trash className="size-3" />
                Delete
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[60px] p-2 text-sm bg-zinc-800 border border-zinc-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Edit your comment..."
            />

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="size-3 mr-1" />
                Save
              </Button>

              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="size-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-300 whitespace-pre-wrap mb-2">
            {comment.content}
          </div>
        )}

        {/* Metadata */}
        {comment.metadata && (
          <div className="flex flex-wrap gap-2 mt-2">
            {comment.metadata.category && (
              <Badge variant="secondary" className="text-xs">
                {comment.metadata.category}
              </Badge>
            )}

            {comment.metadata.priority && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  comment.metadata.priority === "high" &&
                    "bg-red-900 text-red-300",
                  comment.metadata.priority === "medium" &&
                    "bg-yellow-900 text-yellow-300",
                  comment.metadata.priority === "low" &&
                    "bg-green-900 text-green-300",
                )}
              >
                {comment.metadata.priority} priority
              </Badge>
            )}
          </div>
        )}

        {/* Resolution info */}
        {comment.is_resolved && comment.resolved_by_user && (
          <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="size-3" />

            <span>
              Resolved by{" "}
              {comment.resolved_by_user.display_name ||
                comment.resolved_by_user.full_name}
              {comment.resolved_at &&
                ` • ${formatTimeAgo(comment.resolved_at)}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentThreadProps {
  comment: Comment;
  replies: Comment[];
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  onUnresolve: (commentId: string) => void;
}

function CommentThread({
  comment,
  replies,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onUnresolve,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onResolve={onResolve}
        onUnresolve={onUnresolve}
      />

      {replies.length > 0 && (
        <div className="ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mb-2 text-xs text-zinc-400 hover:text-zinc-300"
          >
            {isExpanded ? (
              <ChevronDown className="size-3 mr-1" />
            ) : (
              <ChevronRight className="size-3 mr-1" />
            )}
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </Button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    isReply
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onResolve={onResolve}
                    onUnresolve={onUnresolve}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface CommentsPanelProps {
  nodeId?: string;
  className?: string;
}

const CommentsPanelComponent = ({ nodeId, className }: CommentsPanelProps) => {
  const {
    selectedNodeId,
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
  } = useAppStore(
    useShallow((state) => ({
      selectedNodeId: state.selectedNodeId,
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
    })),
  );

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const isLoadingComments = loadingStates.isLoadingComments;

  const targetNodeId = nodeId || selectedNodeId;
  const newCommentRef = useRef<HTMLTextAreaElement>(null);

  // Load comments when panel opens or target node changes
  useEffect(() => {
    if (popoverOpen.commentsPanel && targetNodeId) {
      fetchCommentsWithFilters({ nodeId: targetNodeId });
    }
  }, [popoverOpen.commentsPanel, targetNodeId, fetchCommentsWithFilters]);

  const handleCreateComment = async () => {
    if (!newComment.trim() || !targetNodeId) return;

    await addNodeComment(
      targetNodeId,
      newComment.trim(),
      replyingTo || undefined,
    );
    setNewComment("");
    setReplyingTo(null);
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

  // Group comments into threads
  const commentThreads = allComments.reduce(
    (threads, comment) => {
      if (!comment.parent_comment_id) {
        // Root comment
        threads.push({
          comment,
          replies: allComments.filter(
            (c) => c.parent_comment_id === comment.id,
          ),
        });
      }

      return threads;
    },
    [] as { comment: Comment; replies: Comment[] }[],
  );

  // Filter threads based on search
  const filteredThreads = commentThreads.filter((thread) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();

    return (
      thread.comment.content.toLowerCase().includes(searchLower) ||
      thread.replies.some((reply) =>
        reply.content.toLowerCase().includes(searchLower),
      ) ||
      (thread.comment.author?.full_name || "")
        .toLowerCase()
        .includes(searchLower) ||
      (thread.comment.author?.display_name || "")
        .toLowerCase()
        .includes(searchLower)
    );
  });

  const totalComments = allComments.length;
  const unresolvedComments = allComments.filter((c) => !c.is_resolved).length;

  const handleToggleCommentsPanel = () => {
    setPopoverOpen({ commentsPanel: !popoverOpen.commentsPanel });
  };

  if (!popoverOpen.commentsPanel) return null;

  return (
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

            <div>
              <h2 className="text-lg font-semibold text-white">Comments</h2>

              {targetNodeId && (
                <p className="text-xs text-zinc-400">
                  {totalComments} comments • {unresolvedComments} unresolved
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("size-8 p-0", showFilters && "bg-zinc-800")}
            >
              <Filter className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={refreshComments}
              className="size-8 p-0"
            >
              <Search className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCommentsPanel}
              className="size-8 p-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-zinc-800 p-4 space-y-3"
            >
              <Input
                placeholder="Search comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border-zinc-700"
              />

              <div className="flex gap-2">
                <Select
                  value={commentFilter.is_resolved?.toString() || "all"}
                  onValueChange={(value) =>
                    setCommentFilter({
                      is_resolved:
                        value === "all" ? undefined : value === "true",
                    })
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>

                    <SelectItem value="false">Unresolved</SelectItem>

                    <SelectItem value="true">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={commentFilter.category || "all"}
                  onValueChange={(value) =>
                    setCommentFilter({
                      category: value === "all" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>

                    <SelectItem value="feedback">Feedback</SelectItem>

                    <SelectItem value="question">Question</SelectItem>

                    <SelectItem value="suggestion">Suggestion</SelectItem>

                    <SelectItem value="issue">Issue</SelectItem>

                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500" />
            </div>
          ) : commentsError ? (
            <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-950/20 rounded-lg">
              <AlertCircle className="size-4" />

              <span>{commentsError}</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <MessageCircle className="size-8 mx-auto mb-2 opacity-50" />

              <p>No comments yet</p>

              <p className="text-xs">Be the first to add a comment!</p>
            </div>
          ) : (
            filteredThreads.map(({ comment, replies }) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={replies}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onResolve={handleResolve}
                onUnresolve={handleUnresolve}
              />
            ))
          )}
        </div>

        {/* New Comment */}
        <div className="border-t border-zinc-800 p-4">
          {replyingTo && (
            <div className="mb-2 text-xs text-zinc-400 flex items-center gap-2">
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

          <div className="space-y-3">
            <Textarea
              ref={newCommentRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              className="bg-zinc-900 border-zinc-700 resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleCreateComment();
                }
              }}
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">Press ⌘+Enter to send</p>

              <Button
                onClick={handleCreateComment}
                disabled={!newComment.trim()}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Send className="size-3 mr-1" />

                {replyingTo ? "Reply" : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const CommentsPanel = memo(CommentsPanelComponent);
CommentsPanel.displayName = "CommentsPanel";
