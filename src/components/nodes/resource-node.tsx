"use client";

import { NodeData } from "@/types/node-data";
import { Node, NodeProps } from "@xyflow/react";
import { ExternalLink, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import { BaseNodeWrapper } from "./base-node-wrapper";

interface ResourceNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const ResourceNodeComponent = (props: ResourceNodeProps) => {
  const { data } = props;

  const resourceUrl = data.metadata?.url as string | undefined;
  const title = (data.metadata?.title as string) || data.content || "Resource";
  const showThumbnail = Boolean(data.metadata?.showThumbnail);
  const showSummary = Boolean(data.metadata?.showSummary);
  const imageUrl = data.metadata?.imageUrl as string | undefined;
  const summary = data.metadata?.summary as string | undefined;

  const header = (
    <>
      <div className="flex size-6 items-center justify-center rounded-sm bg-yellow-700">
        <LinkIcon className="size-4 text-zinc-100" />
      </div>

      <span className="max-w-48 truncate text-sm font-medium text-zinc-300">
        {title}
      </span>
    </>
  );

  const headerActions = resourceUrl && (
    <a
      href={resourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="nodrag flex-shrink-0 rounded-sm bg-zinc-500/20 p-1 text-sky-400 hover:text-sky-300"
      title={resourceUrl}
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="size-4" />
    </a>
  );

  return (
    <BaseNodeWrapper
      {...props}
      headerContent={header}
      headerActions={headerActions}
    >
      {/* Content Area - now display only */}
      <div className="text-zinc-300">
        <div className="flex flex-col gap-3 p-2">
          {/* Thumbnail if enabled and available */}
          {showThumbnail && imageUrl && (
            <div className="pointer-events-none flex w-full justify-center">
              <Image
                src={imageUrl}
                alt={title}
                className="nodrag max-h-32 rounded-md object-cover shadow-md"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/200x120?text=Image+Error";
                }}
                loading="lazy"
                height={128}
                width={200}
              />
            </div>
          )}

          {/* Display URL in a truncated format */}
          {resourceUrl && (
            <div className="truncate text-xs text-sky-400" title={resourceUrl}>
              {resourceUrl.length > 40
                ? resourceUrl.substring(0, 40) + "..."
                : resourceUrl}
            </div>
          )}

          {/* Summary if enabled and available */}
          {showSummary && summary && (
            <div className="mt-1 line-clamp-6 text-left text-xs text-zinc-400">
              {summary}
            </div>
          )}

          {/* Description/Content if different from title */}
          {data.content && data.content !== title && (
            <div className="mt-1 text-xs text-zinc-300 italic">
              {data.content}
            </div>
          )}
        </div>
      </div>
    </BaseNodeWrapper>
  );
};

const ResourceNode = memo(ResourceNodeComponent);
ResourceNode.displayName = "ResourceNode";
export default ResourceNode;
