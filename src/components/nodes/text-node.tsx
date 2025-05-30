"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Node, NodeProps } from "@xyflow/react";
import { Text } from "lucide-react";
import { memo, useMemo } from "react";
import { BaseNodeWrapper } from "./base-node-wrapper";

type TextNodeProps = NodeProps<Node<NodeData>>;

const TextNodeComponent = (props: TextNodeProps) => {
  const { data } = props;

  const { content, metadata } = data;
  const {
    fontSize = "14px",
    fontWeight = "normal",
    textAlign = "center",
    textColor = "#fafafa", // Default to a light text color
  } = metadata ?? {};

  const textStyle = useMemo(() => {
    const style: React.CSSProperties = {
      textAlign: textAlign || "center",
      color: textColor || "inherit",
    };

    if (fontSize) {
      style.fontSize =
        typeof fontSize === "number" ? `${fontSize}px` : fontSize;
    }

    if (fontWeight) {
      style.fontWeight = fontWeight;
    }

    return style;
  }, [fontSize, fontWeight, textAlign, textColor]);

  return (
    <BaseNodeWrapper
      {...props}
      nodeType="Text"
      nodeIcon={<Text className="w-3 h-3" />}
      nodeClassName="text-node min-w-fit min-h-fit h-full p-4" // Adjust minimum width for text nodes
      hideNodeType={true}
      includePadding={false}
    >
      <div
        className={cn(
          "flex items-center min-h-8 w-full",
          textAlign === "center" && "justify-center",
          textAlign === "right" && "justify-end",
          textAlign === "left" && "justify-start",
        )}
        style={textStyle}
      >
        {content || (
          <span className="italic opacity-70 text-sm">
            {props.selected ? "Double click to edit..." : "Text..."}
          </span>
        )}
      </div>
    </BaseNodeWrapper>
  );
};

const TextNode = memo(TextNodeComponent);
TextNode.displayName = "TextNode";
export default TextNode;
