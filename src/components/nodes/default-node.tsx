"use client";

import useAppStore from "@/contexts/mind-map/mind-map-store";
import { useComments } from "@/hooks/use-comments";
import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Node, NodeProps } from "@xyflow/react";
import { NotepadText } from "lucide-react";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { useShallow } from "zustand/shallow";
import { BaseNodeWrapper } from "./base-node-wrapper";

const DefaultNodeComponent = (props: NodeProps<Node<NodeData>>) => {
  const { id, data } = props;

  const { openCommentsPanel } = useAppStore(
    useShallow((state) => ({
      openCommentsPanel: state.openCommentsPanel,
    })),
  );

  const { commentSummaries } = useComments({ autoRefresh: false });
  const commentSummary = commentSummaries.get(id);

  const handleCommentClick = () => {
    openCommentsPanel(id);
  };

  return (
    <BaseNodeWrapper
      {...props}
      nodeClassName={cn(["basic-node h-full gap-0"])}
      nodeType="Note"
      nodeIcon={<NotepadText className="size-4" />}
      commentSummary={commentSummary}
      onCommentClick={handleCommentClick}
    >
      {data.content ? (
        <div className="prose p-4 prose-invert flex flex-col gap-2 prose-ul:flex prose-ul:flex-col prose-ul:gap-2 prose-sm max-w-none break-words prose-headings:m-0">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
      ) : (
        <span className="text-zinc-500 text-sm p-4 italic">
          Click to add content...
        </span>
      )}
    </BaseNodeWrapper>
  );
};

const DefaultNode = memo(DefaultNodeComponent);
DefaultNode.displayName = "DefaultNode";
export default DefaultNode;
