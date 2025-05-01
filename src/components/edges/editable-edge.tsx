import { EdgeData } from "@/types/edge-data";
import { cn } from "@/utils/cn";
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "@xyflow/react";

// Define props specifically for this custom edge type

export default function EditableEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style, // Includes color if set via style.stroke
  data, // Our EdgeData
  selected, // Whether the edge is selected
}: Edge<EdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        className={cn([
          "react-flow__edge-path",
          "cursor-pointer", // Add cursor pointer for better UX
          "transition-all duration-200 ease-in-out", // Add transition for smoothness
          selected ? "!stroke-blue-500" : "stroke-zinc-700", // Change color based on selected state
        ])}
        markerEnd={data?.markerEnd}
        style={style}
        labelShowBg={false}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 999,
            }}
            className="nodrag nopan text-xs bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded shadow-sm cursor-pointer"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
