"use client";

import { NodeData } from "@/types/node-data";
import { Node, NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import { memo } from "react";
import { BaseNodeWrapper } from "./base-node-wrapper";

interface DefaultNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const DefaultNodeComponent = (props: DefaultNodeProps) => {
  const { data } = props;
  const header = (
    <div className="flex size-6 items-center justify-center rounded-sm bg-zinc-700">
      <FileText className="size-4 text-zinc-100" />
    </div>
  );

  return (
    <BaseNodeWrapper {...props} headerContent={header}>
      {data.content || (
        <span className="text-zinc-500 italic">
          Double click or click menu to add content...
        </span>
      )}
    </BaseNodeWrapper>
  );
};

const DefaultNode = memo(DefaultNodeComponent);
DefaultNode.displayName = "DefaultNode";
export default DefaultNode;
