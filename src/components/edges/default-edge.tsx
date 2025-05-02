import { EdgeData } from "@/types/edge-data";
import { cn } from "@/utils/cn";
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";
export default function DefaultEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  ...props
}: EdgeProps<Edge<EdgeData>>) {
  const data = props.data as EdgeData;
  const style = props.style as Edge["style"];
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
          props.selected ? "!stroke-blue-500" : "stroke-zinc-700", // Change color based on selected state
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
            className="cursor-pointer rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-200 shadow-sm" // Tailwind label style
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
