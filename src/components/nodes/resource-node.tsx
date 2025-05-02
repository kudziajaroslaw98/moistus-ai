"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeResizer, Position } from "@xyflow/react";
import { Ellipsis, ExternalLink, Link as LinkIcon } from "lucide-react";
import { useCallback } from "react";

interface ResourceNodeProps extends Node<NodeData> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

export default function ResourceNode(props: ResourceNodeProps) {
  const { id, data, selected, onEditNode } = props;

  const resourceUrl = data.metadata?.url as string | undefined;
  const showThumbnail = Boolean(data.metadata?.showThumbnail);
  const showSummary = Boolean(data.metadata?.showSummary);
  const imageUrl = data.metadata?.imageUrl as string | undefined;
  const summary = data.metadata?.summary as string | undefined;
  const title = (data.metadata?.title as string) || data.content || "Resource";

  const handleEllipsisClick = useCallback(() => {
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  const handleDoubleClick = useCallback(() => {
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  return (
    <div
      className={cn([
        "relative flex h-auto min-h-20 min-w-80 flex-col gap-2 rounded-lg border-2 border-zinc-900 bg-zinc-950 p-2 transition-all",
        selected && "border-sky-700",
      ])}
      onDoubleClick={handleDoubleClick}
    >
      <div className="relative flex h-10 w-full justify-between rounded-md bg-zinc-900 p-2">
        <div className="z-20 flex items-center justify-center gap-4">
          <div className="flex size-6 items-center justify-center rounded-sm bg-yellow-700">
            <LinkIcon className="size-4 text-zinc-100" />
          </div>
          <span className="max-w-48 truncate text-sm font-medium text-zinc-300">
            {title}
          </span>
        </div>

        <div className="z-20 flex items-center justify-center gap-2">
          {/* Link Icon/Button */}
          {resourceUrl && (
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
          )}
          {/* Ellipsis button to open modal */}
          <button
            className="rounded-sm bg-zinc-500/20 p-1 text-sm text-zinc-400 hover:text-zinc-200"
            onClick={handleEllipsisClick}
          >
            <Ellipsis className="size-4 text-zinc-400 hover:text-zinc-200" />
          </button>
        </div>
      </div>

      {/* Content section with flexible layout */}
      <div className="flex flex-col gap-3 p-2">
        {/* Thumbnail if enabled and available */}
        {showThumbnail && imageUrl && (
          <div className="pointer-events-none flex w-full justify-center">
            <img
              src={imageUrl}
              alt={title}
              className="nodrag max-h-32 rounded-md object-cover shadow-md"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/200x120?text=Image+Error";
              }}
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

      <Handle
        type="target"
        position={Position.Top}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />

      <NodeResizer
        color="#0069a8"
        isVisible={selected}
        minWidth={100}
        minHeight={100}
      />
    </div>
  );
}
