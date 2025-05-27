import { Comment } from "@/types/comment-types";
import { cn } from "@/utils/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const REACTION_EMOJIS = [
  { emoji: "👍", label: "thumbs up" },
  { emoji: "❤️", label: "heart" },
  { emoji: "😄", label: "laugh" },
  { emoji: "😮", label: "wow" },
  { emoji: "😢", label: "sad" },
  { emoji: "😡", label: "angry" },
];

interface CommentReactionsProps {
  reactions?: Comment["reactions"];
  onAddReaction?: (emoji: string) => void;
  onRemoveReaction?: (reactionId: string) => void;
  currentUserId?: string;
}

export function CommentReactions({
  reactions = [],
  onAddReaction,
  onRemoveReaction,
  currentUserId,
}: CommentReactionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }

      acc[reaction.emoji].push(reaction);
      return acc;
    },
    {} as Record<string, typeof reactions>,
  );

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.user_id === currentUserId,
    );

    if (existingReaction) {
      onRemoveReaction?.(existingReaction.id);
    } else {
      onAddReaction?.(emoji);
    }
  };

  if (reactions.length === 0 && !onAddReaction) return null;

  return (
    <div className="flex items-center gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, reactionGroup]) => {
        const hasUserReacted = reactionGroup.some(
          (r) => r.user_id === currentUserId,
        );
        return (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReactionClick(emoji)}
                  className={cn(
                    "h-6 px-2 text-xs gap-1",
                    hasUserReacted && "bg-teal-900/50 text-teal-300",
                  )}
                >
                  <span>{emoji}</span>

                  <span>{reactionGroup.length}</span>
                </Button>
              </TooltipTrigger>

              <TooltipContent>
                <div className="text-xs">
                  {reactionGroup
                    .map(
                      (r) =>
                        r.user?.display_name || r.user?.full_name || "Someone",
                    )
                    .join(", ")}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {onAddReaction && (
        <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
            >
              <Plus className="size-3" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-2 bg-zinc-950 border-zinc-800">
            <div className="flex gap-1">
              {REACTION_EMOJIS.map(({ emoji, label }) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleReactionClick(emoji);
                    setShowReactionPicker(false);
                  }}
                  className="h-8 w-8 p-0 text-base hover:bg-zinc-800"
                  title={label}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
