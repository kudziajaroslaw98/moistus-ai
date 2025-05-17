"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Node, NodeProps } from "@xyflow/react";
import { NotepadText } from "lucide-react";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { BaseNodeWrapper } from "./base-node-wrapper";

interface DefaultNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const DefaultNodeComponent = (props: DefaultNodeProps) => {
  const { data } = props;

  return (
    <BaseNodeWrapper
      {...props}
      nodeClassName={cn(["basic-node h-full gap-0"])}
      nodeType="Note"
      nodeIcon={<NotepadText className="size-4" />}
    >
      {data.content ? (
        <div className="prose p-4 prose-invert flex flex-col gap-2 prose-ul:flex prose-ul:flex-col prose-ul:gap-2 prose-sm max-w-none break-words prose-headings:m-0">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
      ) : (
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
