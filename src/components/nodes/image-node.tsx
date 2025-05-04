"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { Ellipsis, Image as ImageIcon } from "lucide-react";
import { memo, useCallback, type MouseEvent } from "react";

interface ImageNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

const ImageNodeComponent = (props: ImageNodeProps) => {
  const { id, data, selected, onEditNode } = props;

  const imageUrl = data.metadata?.image_url as string | undefined;
  const showCaption = Boolean(data.metadata?.showCaption);

  const handleEllipsisClick = useCallback(
    (e: MouseEvent) => {
      onEditNode(id, data);
    },
    [id, data, onEditNode],
  );

  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      onEditNode(id, data);
    },
    [id, data, onEditNode],
  );

  return (
    <div
      className={cn([
        "relative flex min-h-48 min-w-80 max-h-fit flex-col gap-2 rounded-lg border-2 border-zinc-900 bg-zinc-950 p-2 transition-all",
        selected && "border-sky-700",
      ])}
      onDoubleClick={handleDoubleClick}
    >
      <div className="relative flex h-10 w-full justify-between rounded-md bg-zinc-900 p-2">
        <div className="z-20 flex items-center justify-center gap-4">
          <div className="flex size-6 items-center justify-center rounded-sm bg-purple-700">
            <ImageIcon className="size-4 text-zinc-100" />
          </div>
        </div>

        <div className="z-20 flex items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-2">
            {/* Ellipsis button to open modal */}
            <button
              className="rounded-sm bg-zinc-500/20 p-1 text-sm text-zinc-400 hover:text-zinc-200"
              onClick={handleEllipsisClick}
            >
              <Ellipsis className="size-4 text-zinc-400 hover:text-zinc-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Display Area */}
      {imageUrl ? (
        <div className="flex w-full h-full items-center justify-center overflow-hidden rounded-md bg-zinc-800">
          <img
            src={imageUrl}
            alt={data.content || "Node Image"}
            className="nodrag pointer-events-none block h-full w-full min-h-32 object-contain"
            onClick={(e) => e.stopPropagation()}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-[50px] w-full items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-400">
          No Image URL
        </div>
      )}

      {/* Content Area (for caption/description) - now display only */}
      {showCaption && (
        <div className="min-h-[3rem] pt-2 pb-4 text-sm whitespace-pre-wrap text-zinc-300">
          {data.content || (
            <span className="text-zinc-500 italic">
              No caption added. Double click or click the menu to add one...
            </span>
          )}
        </div>
      )}

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
        minHeight={30}
      />
    </div>
  );
};

const ImageNode = memo(ImageNodeComponent);
ImageNode.displayName = "ImageNode";
export default ImageNode;
