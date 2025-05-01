"use client";

import { useCallback } from "react";
import { NodeData } from "@/types/node-data";
import { Node, Handle, Position, NodeResizer } from "@xyflow/react";
import { Ellipsis, Link as LinkIcon, ExternalLink } from "lucide-react";
import { cn } from "@/utils/cn";

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
        "relative min-w-80 min-h-20 h-auto p-2 flex flex-col gap-2 bg-zinc-950 border-2 border-zinc-900 rounded-lg transition-all",
        selected && "border-sky-700",
      ])}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-full relative h-10 p-2 flex justify-between bg-zinc-900 rounded-md">
        <div className="flex gap-4 justify-center items-center z-20">
          <div className="size-6 rounded-sm bg-yellow-700 flex justify-center items-center">
            <LinkIcon className="size-4 text-zinc-100" />
          </div>
          <span className="text-sm font-medium text-zinc-300 truncate max-w-48">
            {title}
          </span>
        </div>

        <div className="flex gap-2 justify-center items-center z-20">
          {/* Link Icon/Button */}
          {resourceUrl && (
            <a
              href={resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nodrag flex-shrink-0 text-sky-400 hover:text-sky-300 p-1 rounded-sm bg-zinc-500/20"
              title={resourceUrl}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-4" />
            </a>
          )}
          {/* Ellipsis button to open modal */}
          <button
            className="text-sm text-zinc-400 hover:text-zinc-200 p-1 rounded-sm bg-zinc-500/20"
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
          <div className="w-full flex justify-center  pointer-events-none">
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
          <div className="text-xs text-sky-400 truncate" title={resourceUrl}>
            {resourceUrl.length > 40
              ? resourceUrl.substring(0, 40) + "..."
              : resourceUrl}
          </div>
        )}

        {/* Summary if enabled and available */}
        {showSummary && summary && (
          <div className="text-xs text-zinc-400 mt-1 text-left line-clamp-6">
            {summary}
          </div>
        )}

        {/* Description/Content if different from title */}
        {data.content && data.content !== title && (
          <div className="text-xs text-zinc-300 italic mt-1">
            {data.content}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="size-1 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="size-1 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="size-1 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="size-1 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
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
