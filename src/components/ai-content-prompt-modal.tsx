import { useState } from "react";
import Modal from "./modal";
import type { AiContentPromptModalProps } from "@/types/ai-content-prompt-modal-props";

export default function AiContentPromptModal({
  isOpen,
  onClose,
  onGenerate,
  isLoading,
}: AiContentPromptModalProps) {
  const [prompt, setPrompt] = useState("");

  const handleGenerateClick = () => {
    onGenerate(prompt);
    // No need to clear prompt here, parent component handles it if needed after generation
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Content (AI)">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-300">
          Enter an optional prompt to guide the AI content generation for the
          selected node. Leave blank for a general expansion based on current
          content.
        </p>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Explain in simpler terms, Add examples..."
          className="w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm"
          disabled={isLoading}
        />
        <button
          onClick={handleGenerateClick}
          className="inline-flex justify-center rounded-sm border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Content"}
        </button>
      </div>
    </Modal>
  );
}
