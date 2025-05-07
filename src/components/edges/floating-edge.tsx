import { EdgeData } from "@/types/edge-data";
import type { PathType } from "@/types/path-types";
import { cn } from "@/utils/cn";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  Position,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type Edge,
} from "@xyflow/react";
import { memo, useMemo } from "react";

// Helper function to get the appropriate path calculation function
const getPathFunction = (pathType?: PathType) => {
  switch (pathType) {
    case "bezier":
      return getBezierPath;
    case "straight":
      return getStraightPath;
    case "step":
      // Using getSimpleBezierPath for a step-like appearance,
      // or you can implement/use getStepPath if available and preferred.
      // getStepPath is not directly exported by older versions,
      // getSmoothStepPath with borderRadius 0 can also give a step-like path.
      // For true step path, you might need a custom implementation or ensure getStepPath is available.
      // Using getSmoothStepPath with radius 0 for a sharper turn, resembling a step.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (params: any) => getSmoothStepPath({ ...params, borderRadius: 0 });
    case "smoothstep":
    default:
      return getSmoothStepPath;
  }
};

const FloatingEdgeComponent = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<Edge<EdgeData>>) => {
  const pathType = data?.metadata?.pathType;
  const pathFunction = useMemo(() => getPathFunction(pathType), [pathType]);

  const [edgePath, labelX, labelY] = pathFunction({
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
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#3b82f6" : style?.stroke || "#6c757d",
        }}
        className={cn(
          "react-flow__edge-path",
          "cursor-pointer",
          "transition-all duration-200 ease-in-out",
        )}
      />

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 1, // Ensure label is clickable if needed, though usually not for edges
            }}
            className="nodrag nopan cursor-pointer rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-200 shadow-sm"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const FloatingEdge = memo(FloatingEdgeComponent);
FloatingEdge.displayName = "FloatingEdge";
export default FloatingEdge;
