"use client";

import { SidePanel } from "@/components/side-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { Loader2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

interface GenerateFromNodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
  selectedNodeCount: number;
}

export function GenerateFromNodesModal({
  onSubmit,
  isLoading,
  selectedNodeCount,
}: GenerateFromNodesModalProps) {
  const { popoverOpen, setPopoverOpen } = useAppStore(
    useShallow((state) => ({
      popoverOpen: state.popoverOpen,
      setPopoverOpen: state.setPopoverOpen,
    })),
  );
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      await onSubmit(prompt);
      setPrompt("");
    } catch (error) {
      console.error("Error generating content:", error);
      // Error is already handled by the calling component
    }
  };

  const handleClose = () => {
    setPrompt("");
    setPopoverOpen({ generateFromNodesModal: false });
  };

  return (
    <SidePanel
      isOpen={popoverOpen.generateFromNodesModal}
      onClose={handleClose}
      title="Generate content from selected nodes"
    >
      <div className="flex flex-col gap-6">
        <div className="bg-zinc-800/40 p-4 rounded-md border border-zinc-700">
          <p className="text-sm text-zinc-300">
            Using AI to generate content based on{" "}
            <span className="font-semibold text-teal-400">
              {selectedNodeCount}
            </span>{" "}
            selected {selectedNodeCount === 1 ? "node" : "nodes"}
          </p>

          {isLoading && (
            <div className="mt-2 flex items-center gap-2 text-teal-400 text-sm animate-pulse">
              <Loader2 className="size-3 animate-spin" />

              <span>AI is processing selected nodes...</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="ai-prompt"
            className="text-sm font-medium text-zinc-300"
          >
            Your prompt
          </label>

          <Textarea
            id="ai-prompt"
            ref={textareaRef}
            className={`min-h-[220px] bg-zinc-900 border-zinc-700 focus:border-teal-500 resize-none ${isLoading ? "opacity-60" : ""}`}
            placeholder="Enter your prompt for the AI (e.g., 'Summarize these nodes' or 'Extract key concepts')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-zinc-300 hover:text-zinc-100"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !prompt.trim()}
            className="bg-teal-600 hover:bg-teal-500 text-white"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-4" />
                Generate
              </span>
            )}
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}
