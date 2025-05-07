import { EdgeData } from "@/types/edge-data";
import { cn } from "@/utils/cn";
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";
import { memo } from "react";

const EditableEdgeComponent = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  ...props
}: EdgeProps<Edge<EdgeData>>) => {
  const data = props.data as EdgeData;
  const baseStyle = props.style as Edge["style"]; // Original style from AppEdge

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
          "cursor-pointer",
          "transition-all duration-200 ease-in-out",
        ])}
        markerEnd={props.markerEnd}
        style={{
          stroke: props.selected ? "#3b82f6" : baseStyle?.stroke || "#6c757d", // Sky-500 for selected, else from props or default
          strokeWidth: baseStyle?.strokeWidth || 2,
        }}
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
            className="nodrag nopan cursor-pointer rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-200 shadow-sm"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const EditableEdge = memo(EditableEdgeComponent);
EditableEdge.displayName = "EditableEdge";
export default EditableEdge;
