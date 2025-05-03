import type { AiContentPromptModalProps } from "@/types/ai-content-prompt-modal-props";
import { useState } from "react";
import Modal from "../modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function AiContentPromptModal({
  isOpen,
  onClose,
  onGenerate,
  isLoading,
}: AiContentPromptModalProps) {
  const [prompt, setPrompt] = useState("");

  const handleGenerateClick = () => {
    onGenerate(prompt);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Content (AI)">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-300">
          Enter an optional prompt to guide the AI content generation for the
          selected node. Leave blank for a general expansion based on current
          content.
        </p>

        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Explain in simpler terms, Add examples..."
          disabled={isLoading}
        />

        <Button
          onClick={handleGenerateClick}
          disabled={isLoading}
          variant="default"
        >
          {isLoading ? "Generating..." : "Generate Content"}
        </Button>
      </div>
    </Modal>
  );
}
