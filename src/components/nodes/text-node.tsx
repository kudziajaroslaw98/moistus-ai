"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { memo, useMemo } from "react";

interface TextNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const TextNodeComponent = (props: TextNodeProps) => {
  const { id, data, selected, onEditNode } = props;

  const { content, metadata } = data;
  const {
    fontSize = "14px",
    fontWeight = "normal",
    textAlign = "left",
    showBackground = false,
    backgroundColor = "#3f3f46", // Default to a zinc-like color
    textColor = "#fafafa", // Default to a light text color
  } = metadata ?? {};

  const nodeStyle = useMemo(() => {
    const style: React.CSSProperties = {
      textAlign: textAlign || "left",
      color: textColor || "inherit", // Default to inherit or a sensible default
      justifyContent:
        textAlign === "center"
          ? "center"
          : textAlign === "right"
            ? "flex-end"
            : "flex-start",
    };

    if (fontSize) {
      style.fontSize =
        typeof fontSize === "number" ? `${fontSize}px` : fontSize;
    }

    if (fontWeight) {
      style.fontWeight = fontWeight;
    }

    if (showBackground) {
      style.backgroundColor = backgroundColor || "transparent";
    }

    return style;
  }, [
    fontSize,
    fontWeight,
    textAlign,
    showBackground,
    backgroundColor,
    textColor,
  ]);

  return (
    <div
      className={cn(
        "relative group rounded-md", // Add group for hover effect on button
        selected && "ring-2 ring-sky-500",
        showBackground && "shadow-md",
        "p-2 min-w-24 h-full min-h-12 flex items-center ",
      )}
      style={nodeStyle}
    >
      {content || (
        <span className="italic opacity-70">
          {selected ? "Double click to edit..." : "Text..."}
        </span>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !rounded-full !bg-zinc-600 !outline-2 !outline-zinc-800"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !rotate-45 !bg-zinc-400 !outline-2 !outline-zinc-800 !translate-y-1"
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !rounded-full !bg-zinc-600 !outline-2 !outline-zinc-800"
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !rounded-full !bg-zinc-400 !outline-2 !outline-zinc-800"
      />

      <NodeResizer
        color="#0069a8"
        isVisible={selected}
        minWidth={80}
        minHeight={30}
      />
    </div>
  );
};

const TextNode = memo(TextNodeComponent);
TextNode.displayName = "TextNode";
export default TextNode;
