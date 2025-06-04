import { MergeSuggestionsModalProps } from "@/types/merge-suggestions-modal-props";
import { NodeData } from "@/types/node-data";
import { Node } from "@xyflow/react";
import Modal from "./modal";

interface ExtendedMergeSuggestionsModalProps
  extends MergeSuggestionsModalProps {
  isLoading?: boolean;
}

export default function MergeSuggestionsModal({
  isOpen,
  onClose,
  suggestions,
  onAccept,
  onDismiss,
  nodes,
  isLoading,
}: ExtendedMergeSuggestionsModalProps) {
  const getNodeContentSnippet = (nodeId: string): string => {
    const node: Node<NodeData> | undefined = nodes.find((n) => n.id === nodeId);
    if (!node || !node.data?.content) return "<Empty Node>";

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = node.data.content;
    const textContent = (tempDiv.textContent || tempDiv.innerText || "").trim();

    return textContent.length > 40
      ? textContent.substring(0, 40) + "..."
      : textContent || "<Empty Node>";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Merge Suggestions (AI)">
      {suggestions.length === 0 ? (
        <p className="text-zinc-400">
          No merge suggestions available at this time.
        </p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-2">
          {" "}
          {/* Add max height and scroll */}
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.node1Id}-${suggestion.node2Id}-${index}`}
              className="bg-zinc-750 rounded-sm border border-zinc-700 p-3 shadow-sm"
            >
              <p className="mb-2 text-sm text-zinc-300">
                Merge &quot;
                <span className="font-semibold text-zinc-100 italic">
                  {getNodeContentSnippet(suggestion.node2Id)}
                </span>
                &quot; into &quot;
                <span className="font-semibold text-zinc-100 italic">
                  {getNodeContentSnippet(suggestion.node1Id)}
                </span>
                &quot;?
              </p>

              {suggestion.reason && (
                <p className="mb-3 text-xs text-zinc-400">
                  Reason: {suggestion.reason}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onDismiss(suggestion)}
                  className="focus:ring-offset-zinc-750 rounded-sm border border-zinc-600 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                  disabled={isLoading}
                >
                  Dismiss
                </button>

                <button
                  onClick={() => onAccept(suggestion)}
                  className="focus:ring-offset-zinc-750 rounded-sm border border-transparent bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Merging..." : "Accept"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
