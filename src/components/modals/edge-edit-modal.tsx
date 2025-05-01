import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { NodeData } from "@/types/node-data";
// import { nodeTypes } from "@/constants/node-types"; // Not needed here
import { edgeTypes } from "@/constants/edge-types"; // Keep this import
import { AppEdge } from "@/types/app-edge"; // Import AppEdge
import { EdgeData } from "@/types/edge-data"; // Import EdgeData
import Modal from "../modal";

// Get available React Flow edge types by extracting keys from edgeTypes constant
const availableEdgeTypes = Object.keys(edgeTypes);

// Define available marker end options
const markerEndOptions = [
  { value: "none", label: "None" }, // Use 'none' as a conceptual value for no marker
  { value: "arrow", label: "Default Arrow" },
  { value: "arrowclosed", label: "Closed Arrow" },
];

interface EdgeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  edge: AppEdge | null; // The edge being edited
  // onSave now accepts Partial<EdgeData> for all fields
  onSave: (edgeId: string, changes: Partial<EdgeData>) => Promise<void>;
  isLoading: boolean; // To disable form during save
  nodes: Node<NodeData>[]; // Pass nodes to display node content
}

export default function EdgeEditModal({
  isOpen,
  onClose,
  edge,
  onSave,
  isLoading,
  nodes, // Passed but not currently used for simplicity
}: EdgeEditModalProps) {
  // Core edge properties
  const [label, setLabel] = useState("");
  const [type, setType] = useState("smoothstep"); // Default to 'smoothstep'
  const [animated, setAnimated] = useState(false);
  const [color, setColor] = useState("#6c757d"); // Default color
  const [strokeWidth, setStrokeWidth] = useState<number | undefined>(undefined);
  const [markerEnd, setMarkerEnd] = useState<string | undefined>(undefined); // State for markerEnd

  // Removed state variables for description, strength, directional

  useEffect(() => {
    // Initialize state when a new edge is selected
    if (edge) {
      setLabel(edge.label || edge.data?.label || ""); // Read from edge.label or data.label
      setType(edge.type || edge.data?.type || "smoothstep"); // Read from edge.type or data.type
      setAnimated(edge.animated ?? edge.data?.animated ?? false); // Read from edge.animated or data.animated
      setColor((edge.style?.stroke as string) || edge.data?.color || "#6c757d"); // Read from style.stroke or data.color
      setStrokeWidth(
        (edge.style?.strokeWidth as number) ||
          edge.data?.strokeWidth ||
          undefined,
      );
      setMarkerEnd(edge.markerEnd || edge.data?.markerEnd || "none");
    } else {
      setLabel("");
      setType("smoothstep");
      setAnimated(false);
      setColor("#6c757d");
      setStrokeWidth(undefined);
      setMarkerEnd(undefined); // Reset markerEnd
    }
    if (!isOpen) {
      setLabel("");
      setType("smoothstep");
      setAnimated(false);
      setColor("#6c757d");
      setStrokeWidth(undefined);
      setMarkerEnd(undefined); // Clear markerEnd
    }
  }, [edge, isOpen]); // Depend on edge and isOpen state

  const handleSave = async () => {
    if (!edge || isLoading) return;
    const changes: Partial<EdgeData> = {
      label: label.trim() === "" ? undefined : label.trim(), // Save empty string as undefined/null
      type: type,
      animated: animated, // Save animated state
      color: color, // Save color explicitly if mapped to DB/data
      strokeWidth: strokeWidth, // Save stroke width explicitly
      markerEnd: markerEnd === "none" ? undefined : markerEnd,
    };

    await onSave(edge.id, changes);
  };

  if (!isOpen || !edge) return null;

  const sourceNodeContent =
    nodes.find((n) => n.id === edge.source)?.data?.content || edge.source;
  const targetNodeContent =
    nodes.find((n) => n.id === edge.target)?.data?.content || edge.target;

  const getContentSnippet = (content: string): string => {
    if (!content) return "<Empty>";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const textContent = (tempDiv.textContent || tempDiv.innerText || "").trim();
    return textContent.length > 30
      ? textContent.substring(0, 30) + "..."
      : textContent || "<Empty>";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Connection`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          From:{" "}
          <span className="font-semibold text-zinc-200 italic">
            {getContentSnippet(sourceNodeContent)}
          </span>
        </p>

        <p className="text-sm text-zinc-400">
          To:{" "}
          <span className="font-semibold text-zinc-200 italic">
            {getContentSnippet(targetNodeContent)}
          </span>
        </p>
        <hr className="my-2 border-zinc-700" />

        <div>
          <h3 className="text-md mb-2 font-semibold text-zinc-200">
            Properties
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                disabled={isLoading}
                placeholder="e.g., leads to, is part of"
              />
            </div>
            {/* Description Input */}
            {/* Removed Description Input */}
            {/* Type Select */}
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
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                disabled={isLoading}
              >
                {availableEdgeTypes.map((edgeType) => (
                  <option key={edgeType} value={edgeType}>
                    {edgeType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-zinc-400">
                <input
                  type="checkbox"
                  checked={animated}
                  onChange={(e) => setAnimated(e.target.checked)}
                  className="mr-2 rounded border-zinc-600 text-teal-600 shadow-sm focus:ring-teal-500 disabled:opacity-50"
                  disabled={isLoading}
                />
                Animated
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-md mb-2 font-semibold text-zinc-200">
            Appearance
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                value={color || "#000000"} // Provide a default color if color is undefined
                onChange={(e) => setColor(e.target.value)}
                className="mt-1 block h-8 w-full cursor-pointer rounded-sm border border-zinc-600 bg-zinc-700 px-1 py-1 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                disabled={isLoading}
              />

              {color && (
                <button
                  onClick={() => setColor(undefined)}
                  className="mt-1 text-xs text-zinc-400 underline hover:text-zinc-200"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Stroke Width Input */}
            <div>
              <label
                htmlFor="strokeWidth"
                className="block text-sm font-medium text-zinc-400"
              >
                Stroke Width (px)
              </label>
              <input
                id="strokeWidth"
                type="number"
                value={strokeWidth ?? ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setStrokeWidth(
                    isNaN(value) || value <= 0 ? undefined : value,
                  );
                }}
                min="1"
                max="10" // Example max
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                disabled={isLoading}
                placeholder="e.g. 2"
              />
              {/* Button to clear stroke width (reset to default/undefined) */}
              {strokeWidth !== undefined && (
                <button
                  onClick={() => setStrokeWidth(undefined)}
                  className="mt-1 text-xs text-zinc-400 underline hover:text-zinc-200"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Marker End Select */}
            <div>
              <label
                htmlFor="markerEnd"
                className="block text-sm font-medium text-zinc-400"
              >
                Arrow Style (Marker End)
              </label>
              <select
                id="markerEnd"
                value={markerEnd || "none"} // Use 'none' if markerEnd is undefined for the select value
                onChange={(e) =>
                  setMarkerEnd(
                    e.target.value === "none" ? undefined : e.target.value,
                  )
                } // Map 'none' back to undefined for state
                className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
                disabled={isLoading}
              >
                {markerEndOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Add field for markerEnd if you manage it via the modal */}
            {/* <div>
                     <label htmlFor="markerEnd" className="block text-sm font-medium text-zinc-400">Arrow Style</label>
                      <select ... > </select>
                </div> */}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-sm border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 shadow-sm hover:bg-zinc-700 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-sm border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
