import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { NodeData } from "@/types/node-data";
import { nodeTypes } from "@/constants/node-types";
import { edgeTypes } from "@/constants/edge-types";
import { AppEdge } from "@/types/app-edge";
import Modal from "../modal";

// Get available React Flow edge types by extracting keys from edgeTypes constant
const availableEdgeTypes = Object.keys(edgeTypes);

interface EdgeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  edge: AppEdge | null; // The edge being edited
  onSave: (edgeId: string, changes: Partial<AppEdge["data"]>) => Promise<void>;
  isLoading: boolean; // To disable form during save
  nodes: Node<NodeData>[]; // Pass nodes to display node content if needed (e.g., for labels)
}

export default function EdgeEditModal({
  isOpen,
  onClose,
  edge,
  onSave,
  isLoading,
  nodes, // Passed but not currently used for simplicity
}: EdgeEditModalProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("smoothstep"); // Default to 'smoothstep'
  const [color, setColor] = useState("#6c757d"); // Default color matching border-zinc-600
  // Add other edge properties you might want to edit

  useEffect(() => {
    // Initialize state when a new edge is selected
    if (edge) {
      setLabel(edge.data?.label || "");
      setType(edge.type || "smoothstep");
      setColor((edge.style?.stroke as string) || "#6c757d");
      // Initialize other properties here
    } else {
      // Reset state when modal closes or edge is null
      setLabel("");
      setType("smoothstep");
      setColor("#6c757d");
      // Reset other properties
    }
  }, [edge]);

  const handleSave = async () => {
    if (!edge || isLoading) return;

    const changes: Partial<AppEdge["data"]> = {
      label: label.trim() === "" ? undefined : label.trim(), // Save empty string as undefined/null
      type: type,
      style: {
        ...edge.style, // Preserve existing styles
        stroke: color, // Update stroke color
        // Add other style updates here
      },
      color: color, // Save color explicitly if needed in data
      // Add other data property updates here
    };

    await onSave(edge.id, changes);
    // Modal will be closed by the parent component's onSave completion
  };

  if (!isOpen || !edge) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Edge: ${edge.id}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          Source:{" "}
          <span className="font-mono text-zinc-300">
            {nodes.find((n) => n.id === edge.source)?.data?.content ||
              edge.source}
          </span>
        </p>
        <p className="text-sm text-zinc-400">
          Target:{" "}
          <span className="font-mono text-zinc-300">
            {nodes.find((n) => n.id === edge.target)?.data?.content ||
              edge.target}
          </span>
        </p>
        <div>
          <label
            htmlFor="edgeLabel"
            className="block text-sm font-medium text-zinc-400"
          >
            Label
          </label>
          <input
            id="edgeLabel"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            disabled={isLoading}
            placeholder="e.g., leads to, is part of"
          />
        </div>
        <div>
          <label
            htmlFor="edgeType"
            className="block text-sm font-medium text-zinc-400"
          >
            Type
          </label>
          <select
            id="edgeType"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            disabled={isLoading}
          >
            {availableEdgeTypes.map((edgeType) => (
              <option key={edgeType} value={edgeType}>
                {edgeType}
              </option>
            ))}
            {/* You might want a more user-friendly mapping than just type names */}
          </select>
        </div>
        <div>
          <label
            htmlFor="edgeColor"
            className="block text-sm font-medium text-zinc-400"
          >
            Color
          </label>
          <input
            id="edgeColor"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 block w-full h-8 rounded-sm border border-zinc-600 bg-zinc-700 px-1 py-1 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm cursor-pointer"
            disabled={isLoading}
          />
        </div>
        {/* Add fields for other properties like animated, markerEnd */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-sm border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-sm border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
