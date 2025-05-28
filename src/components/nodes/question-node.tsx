"use client";

import { NodeData } from "@/types/node-data";
import { Node, NodeProps } from "@xyflow/react";
import { CircleHelp } from "lucide-react";
import { memo } from "react";
import { BaseNodeWrapper } from "./base-node-wrapper";

type QuestionNodeProps = NodeProps<Node<NodeData>>;

const QuestionNodeComponent = (props: QuestionNodeProps) => {
  const { data } = props;
  const aiAnswer = data.aiData?.aiAnswer as string | undefined;

  return (
    <BaseNodeWrapper
      {...props}
      nodeClassName="question-node"
      nodeType="Question"
      nodeIcon={<CircleHelp className="size-4" />}
    >
      {/* Content Area - now display only */}
      <div className="text-node-text-main text-xl font-bold tracking-tight leading-5 text-center">
        {data.content || (
          <span className="text-zinc-500 italic">
            Double click or click the menu to add content...
          </span>
        )}
      </div>

      {aiAnswer && (
        <>
          <div className="text-center text-sm font-medium text-node-text-secondary w-full relative">
            <hr className="bg-node-accent w-full h-0.5 border-0 top-1/2 left-0 absolute z-1" />

            <span className="relative px-4 py-1 font-lora font-semibold bg-node-accent rounded-md text-node-text-main z-10">
              AI Answer
            </span>
          </div>

          <div className="text-left text-sm text-node-text-secondary">
            {aiAnswer}
          </div>
        </>
      )}
    </BaseNodeWrapper>
  );
};

const QuestionNode = memo(QuestionNodeComponent);
QuestionNode.displayName = "QuestionNode";
export default QuestionNode;
