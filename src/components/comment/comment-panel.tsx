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
  Heart,
  ThumbsUp,
  Smile,
  Plus,
  Tag,
  Paperclip,
  ExternalLink,
  Image,
  File,
  Lock,
  Unlock,
  AtSign,
  Eye,
  EyeOff,
  Archive,
  Pin,
  Flag,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";









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
    // Add these new methods to your store
    addCommentReaction,
    removeCommentReaction,
    currentUser,
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
      // These might need to be added to your store
      addCommentReaction: state.addCommentReaction || (() => Promise.resolve()),
      removeCommentReaction: state.removeCommentReaction || (() => Promise.resolve()),
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
    }
  }, [popoverOpen.commentsPanel, targetNodeId, fetchCommentsWithFilters]);

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
        }
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

  const handleRemoveReaction = async (commentId: string, reactionId: string) => {
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
    if (commentFilter.is_resolved !== undefined && comment.is_resolved !== commentFilter.is_resolved) {
      return false;
    }

    if (commentFilter.category && comment.metadata?.category !== commentFilter.category) {
      return false;
    }

    return true;
  });

  const totalComments = allComments.length;
  const unresolvedComments = allComments.filter((c) => !c.is_resolved).length;
  const highPriorityComments = allComments.filter((c) => c.metadata?.priority === 'high').length;

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
              <MessageCircle className="size-5 text-teal-
