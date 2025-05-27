import { Comment } from "@/types/comment-types";
import { cn } from "@/utils/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { Separator } from "@radix-ui/react-select";
import {
  Check,
  CheckCircle,
  Clock,
  Eye,
  Flag,
  MoreHorizontal,
  Pencil,
  Pin,
  Reply,
  Tag,
  Trash,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { UserAvatar } from "../ui/user-avatar";
import { CommentAttachments } from "./comment-attachments";
import { CommentMentions } from "./comment-mentions";
import { CommentReactions } from "./comment-reactions";

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  maxDepth?: number;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
  onUnresolve?: (commentId: string) => void;
  onAddReaction?: (commentId: string, emoji: string) => void;
  onRemoveReaction?: (commentId: string, reactionId: string) => void;
  currentUserId?: string;
}

export function CommentItem({
  comment,
  depth = 0,
  maxDepth = 5,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onUnresolve,
  onAddReaction,
  onRemoveReaction,
  currentUserId,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReply = depth > 0;
  const canReply = depth < maxDepth;
  const isOwnComment = comment.author_id === currentUserId;

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
        isReply && "border-l-2 border-zinc-700 pl-4 mt-3",
        depth > 0 && "ml-4",
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

                {comment.is_edited && (
                  <span className="italic">
                    (edited{" "}
                    {comment.edited_at ? formatTimeAgo(comment.edited_at) : ""})
                  </span>
                )}
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
              {isOwnComment && (
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
              )}

              {canReply && (
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
              )}

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
                disabled={!isOwnComment}
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

        {/* Attachments */}
        <CommentAttachments attachments={comment.attachments} />

        {/* Mentions */}
        <CommentMentions
          mentions={comment.mentions}
          mentionedUsers={comment.mentioned_users}
        />

        {/* Metadata */}
        {comment.metadata && (
          <div className="flex flex-wrap gap-2 mt-2">
            {comment.metadata.category && (
              <Badge variant="secondary" className="text-xs">
                <Tag className="size-2 mr-1" />

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
                <Flag className="size-2 mr-1" />
                {comment.metadata.priority} priority
              </Badge>
            )}

            {comment.metadata.tags &&
              comment.metadata.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}

            {comment.metadata.highlighted_text && (
              <Badge variant="outline" className="text-xs">
                <Eye className="size-2 mr-1" />
                Referenced text
              </Badge>
            )}

            {comment.metadata.position && (
              <Badge variant="outline" className="text-xs">
                <Pin className="size-2 mr-1" />
                Positioned
              </Badge>
            )}
          </div>
        )}

        {/* Reactions */}
        <CommentReactions
          reactions={comment.reactions}
          onAddReaction={(emoji) => onAddReaction?.(comment.id, emoji)}
          onRemoveReaction={(reactionId) =>
            onRemoveReaction?.(comment.id, reactionId)
          }
          currentUserId={currentUserId}
        />

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
