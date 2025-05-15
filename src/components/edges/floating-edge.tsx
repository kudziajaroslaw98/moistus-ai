import { getFloatingEdgePath } from "@/helpers/get-floating-edge-path";
import { EdgeData } from "@/types/edge-data";
import type { NodeData } from "@/types/node-data";
import type { PathType } from "@/types/path-types";
import { cn } from "@/utils/cn";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Node,
  useInternalNode,
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
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<Edge<EdgeData>>) => {
  const pathType = data?.metadata?.pathType;
  const pathFunction = useMemo(() => getPathFunction(pathType), [pathType]);
  const sourceNode = useInternalNode<Node<NodeData>>(source);
  const targetNode = useInternalNode<Node<NodeData>>(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sourceX, sourceY, targetX, targetY, sourcePos, targetPos } =
    getFloatingEdgePath(sourceNode, targetNode);

  const [edgePath, labelX, labelY] = pathFunction({
    sourceX,
    sourceY,
    sourcePosition: sourcePos,
    targetX,
    targetY,
    targetPosition: targetPos,
  });

  // Determine style based on parent link status
  const isParentLink = data?.metadata?.isParentLink;

  const baseStroke = isParentLink ? "#88aaff" : "#6c757d";
  const baseStrokeWidth = isParentLink ? 4 : 2;

  // Apply selection override if needed
  const finalStroke = selected ? "#3b82f6" : baseStroke;
  const finalStrokeWidth = baseStrokeWidth; // Keep the width based on parent link status

  const finalStyle = {
    ...style, // Include any other styles passed in (though unlikely for edges)
    stroke: finalStroke,
    strokeWidth: finalStrokeWidth,
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={finalStyle}
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
