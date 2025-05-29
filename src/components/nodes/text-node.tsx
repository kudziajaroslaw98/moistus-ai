"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { memo, useMemo } from "react";

type TextNodeProps = NodeProps<Node<NodeData>>;

const TextNodeComponent = (props: TextNodeProps) => {
  const { data, selected } = props;
  // const connection = useConnection();
  // const isTarget = connection.inProgress && connection.fromNode?.id !== data.id;

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
        type="source"
        position={Position.Bottom}
        className="w-full h-4 bg-transparent"
      />

      <Handle
        type="source"
        position={Position.Top}
        className="w-full h-4 bg-transparent"
      />

      <Handle
        type="source"
        position={Position.Left}
        className="w-4 h-full bg-transparent"
      />

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-full bg-transparent"
      />

      <Handle
        className={cn([
          "w-full h-full absolute top-0 left-0 rounded-full transform-none border-none opacity-0",
          "h-1/2 translate-y-1/2",
          // isTarget ? "h-full" : "h-1/2 translate-y-1/2", // Adjusted for isTarget
        ])}
        position={Position.Top}
        type="target"
        isConnectableStart={false}
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
