import React, { useState, useEffect } from "react";
import Modal from "@/components/modal"; // Assuming you have a generic Modal component
import { Loader2 } from "lucide-react";

interface AiContentPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string; // The ID of the node for which content is being generated
  onGenerateContent: (
    nodeId: string,
    additionalPrompt?: string,
  ) => Promise<void>; // Function to trigger AI generation
  isLoading: boolean; // Loading state for the AI generation process
}

export default function AiContentPromptModal({
  isOpen,
  onClose,
  nodeId,
  onGenerateContent,
  isLoading,
}: AiContentPromptModalProps) {
  const [additionalPrompt, setAdditionalPrompt] = useState("");

  // Reset prompt when modal opens for a new node or closes
  useEffect(() => {
    if (isOpen) {
      setAdditionalPrompt("");
    }
  }, [isOpen, nodeId]);

  const handleGenerateClick = async () => {
    // Pass the nodeId and the additional prompt to the handler
    await onGenerateContent(nodeId, additionalPrompt.trim() || undefined);
    // The parent component (MindMapCanvas) should handle closing the modal
    // once the generation is complete (or fails).
    // onClose(); // Don't close here, let parent manage state based on isLoading
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate AI Content">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          Provide an optional additional prompt to guide the AI content
          generation for this node.
        </p>
        <textarea
          value={additionalPrompt}
          onChange={(e) => setAdditionalPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="e.g., 'Explain this concept in simple terms', 'List key takeaways', 'Suggest related topics'"
          disabled={isLoading}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateClick}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
