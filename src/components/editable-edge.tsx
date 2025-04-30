import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  getBezierPath,
} from "@xyflow/react";
import { useCallback } from "react";

// Define props specifically for this custom edge type
interface EditableEdgeProps extends Edge<EdgeData> {
  // Add any custom props needed, though usually edge data is enough
  onEdgeClick: (edge: AppEdge) => void; // Handler to open modal
}

export default function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  type,
  targetPosition,
  style, // Includes color if set via style.stroke
  data, // Our EdgeData
  selected, // Whether the edge is selected
  onEdgeClick, // Custom prop passed from React Flow
}: EditableEdgeProps) {
  // Get the path data for a bezier curve
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handle the click on the edge path or label
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent React Flow's default edge click/selection
      // Construct a minimal edge object to pass to the handler
      // The full edge object is managed by React Flow and its data prop
      if (onEdgeClick) {
        // Pass the full edge object received by the component
        // React Flow passes the full Edge object as part of props
        const edge: AppEdge = {
          id,
          source: (data as any)?.source || "", // Fallback, should be available
          target: (data as any)?.target || "", // Fallback, should be available
          type: "editableEdge", // Or the actual type
          data,
          style,
          // Add other React Flow internal props if needed, but data should be enough for modal
          sourceHandle: null,
          targetHandle: null, // Assuming default handles
          selected: selected,
          hidden: false,
          animated: true,
          deletable: true,
          focusable: true,
          zIndex: 1,
        };
        // Reconstruct the edge object properly from props
        const fullEdge: AppEdge = {
          id,
          source: data?.source || "",
          target: data?.target || "",
          type: "editableEdge", // Or the actual type derived from props.type
          data,
          style,
          selected,
          // Add any other standard React Flow edge properties if necessary
          deletable: true,
          sourceHandle: null,
          targetHandle: null,
          hidden: false,
          focusable: true,
          zIndex: 1,
        };

        // A safer way is to pass the necessary minimal data or rely on parent to find the edge
        // Let's simplify and just pass the ID and mapId (if available in data)
        onEdgeClick({
          id,
          source: data?.source || "",
          target: data?.target || "",
          type: type || "editableEdge",
          data: data || {}, // Pass data
          style,
          selected: selected,
          // Add any other required standard props if needed by the handler
          sourceHandle: null,
          targetHandle: null,
          deletable: true,
          hidden: false,
          focusable: true,
          zIndex: 1,
        });
      }
    },
    [id, data, style, selected, onEdgeClick, type], // Add all dependencies
  );

  // Determine stroke color: use style.stroke if present, otherwise a default
  const strokeColor = style?.stroke
    ? String(style.stroke)
    : data?.color || "#6c757d"; // Fallback color

  // Apply selected style
  const edgeClasses = `react-flow__edge-path ${selected ? "selected-edge" : ""}`; // Add a class for selected state

  return (
    <>
      <BaseEdge
        path={edgePath}
        // Apply calculated stroke color here
        style={{ ...style, stroke: strokeColor }}
        // Attach click handler to the path
        // Or attach to a transparent overlay path for easier clicking? Let's try path first.
        onClick={handleClick}
        className={edgeClasses} // Apply class
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all", // Allow clicks on the label
              zIndex: 999, // Ensure label is above other elements
            }}
            className="nodrag nopan text-xs bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded shadow-sm cursor-pointer" // Tailwind label style
            onClick={handleClick} // Make label clickable too
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
