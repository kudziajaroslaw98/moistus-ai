"use client";

import { NodeData } from "@/types/node-data";
import { Node, NodeProps } from "@xyflow/react";
import { HelpCircle } from "lucide-react";
import { memo } from "react";
import { BaseNodeWrapper } from "./base-node-wrapper";

interface QuestionNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const QuestionNodeComponent = (props: QuestionNodeProps) => {
  const { data } = props;
  const header = (
    <div className="flex size-6 items-center justify-center rounded-sm bg-blue-700">
      <HelpCircle className="size-4 text-zinc-100" />
    </div>
  );
  return (
    <BaseNodeWrapper {...props} headerContent={header}>
      {/* Content Area - now display only */}
      <div className="text-zinc-300">
        {data.content || (
          <span className="text-zinc-500 italic">
            Double click or click the menu to add content...
          </span>
        )}
      </div>
    </BaseNodeWrapper>
  );
};

const QuestionNode = memo(QuestionNodeComponent);
QuestionNode.displayName = "QuestionNode";
export default QuestionNode;
