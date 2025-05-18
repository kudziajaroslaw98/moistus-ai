"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Node, NodeProps, NodeResizer } from "@xyflow/react";
import { memo, useCallback } from "react";

interface GroupNodeProps extends NodeProps<Node<NodeData>> {}

const PADDING = 40;

const GroupNodeComponent = (props: GroupNodeProps) => {
  const { data, selected } = props;

  const backgroundColor =
    (data.metadata?.backgroundColor as string) || "rgba(113, 113, 122, 0.1)";
  const borderColor = (data.metadata?.borderColor as string) || "#52525b";
  const label = (data.metadata?.label as string) || "";

  const handleDoubleClick = useCallback(() => {
    console.log("Group node double-clicked, potential edit action");
  }, []);

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 shadow-inner w-full h-full",
        selected ? "border-sky-600" : "border-dashed",
      )}
      style={{
        padding: `${PADDING}px`,
        borderColor: selected ? undefined : borderColor,
        backgroundColor: backgroundColor,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {label && (
        <div className="absolute -top-6 left-2 rounded-t-md bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-200">
          {label}
        </div>
      )}

      {/* Resizer should still work */}
      <NodeResizer
        color="#0069a8"
        isVisible={selected}
        minWidth={150}
        minHeight={100}
      />
    </div>
  );
};

const GroupNode = memo(GroupNodeComponent);
GroupNode.displayName = "GroupNode";
export default GroupNode;
