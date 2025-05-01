import { EdgeData } from "@/types/edge-data";
import { cn } from "@/utils/cn";
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
} from "@xyflow/react";
export default function DefaultEdge({
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
          selected ? "!stroke-blue-500" : "stroke-zinc-700", // Change color based on selected state
          "",
        ])} // Apply class
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
              pointerEvents: "all", // Allow clicks on the label
              zIndex: 999, // Ensure label is above other elements
            }}
            className="text-xs bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded shadow-sm cursor-pointer" // Tailwind label style
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
