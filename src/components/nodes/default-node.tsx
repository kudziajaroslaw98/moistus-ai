"use client";

import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { Ellipsis, FileText } from "lucide-react"; // Using FileText as a generic icon
import { useCallback } from "react";

interface DefaultNodeProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

export default function DefaultNode(props: DefaultNodeProps) {
  const { id, data, selected, onEditNode } = props;

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
          <div className="flex size-6 items-center justify-center rounded-sm bg-zinc-700">
            <FileText className="size-4 text-zinc-100" /> {/* Generic icon */}
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

      {/* Content Area - now display only */}
      <div className="min-h-[3rem] pt-2 pb-4 text-sm whitespace-pre-wrap text-zinc-300">
        {data.content || (
          <span className="text-zinc-500 italic">
            Double click or click the menu to add content...
          </span>
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
        minHeight={30}
      />
    </div>
  );
}
