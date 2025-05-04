"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Node, NodeProps } from "@xyflow/react";
import { CheckSquare } from "lucide-react";
import { memo } from "react";
import { BaseNodeWrapper } from "./base-node-wrapper";

interface TaskNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const TaskNodeComponent = (props: TaskNodeProps) => {
  const { data } = props;
  const isComplete = Boolean(data.metadata?.isComplete);
  const header = (
    <>
      <div className="flex size-6 items-center justify-center rounded-sm bg-green-700">
        <CheckSquare className="size-4 text-zinc-100" />
      </div>

      {isComplete && (
        <span className="text-xs font-medium text-green-400">Done</span>
      )}
    </>
  );

  return (
    <BaseNodeWrapper {...props} headerContent={header}>
      <div className={cn(["text-zinc-300", isComplete && "line-through"])}>
        {data.content || (
          <span className="text-zinc-500 italic">
            Double click or click the menu to add description...
          </span>
        )}
      </div>
    </BaseNodeWrapper>
  );
};

const TaskNode = memo(TaskNodeComponent);
TaskNode.displayName = "TaskNode";
export default TaskNode;
