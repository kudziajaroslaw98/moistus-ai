"use client";

import { useCallback } from "react";
import { NodeData } from "@/types/node-data";
import { Node, Handle, Position, NodeResizer } from "@xyflow/react";
import { Ellipsis, FileText } from "lucide-react"; // Using FileText as a generic icon
import { cn } from "@/utils/cn";

interface DefaultNodeProps extends Node<NodeData> {
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
        "relative min-w-80 min-h-20 h-auto p-2 flex flex-col gap-2 bg-zinc-950 border-2 border-zinc-900 rounded-lg transition-all",
        selected && "border-sky-700",
      ])}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-full relative h-10 p-2 flex justify-between bg-zinc-900 rounded-md">
        <div className="flex gap-4 justify-center items-center z-20">
          <div className="size-6 rounded-sm bg-zinc-700 flex justify-center items-center">
            <FileText className="size-4 text-zinc-100" /> {/* Generic icon */}
          </div>
        </div>

        <div className="flex gap-4 justify-center items-center z-20">
          <div className="flex gap-2 justify-center items-center">
            {/* Ellipsis button to open modal */}
            <button
              className="text-sm text-zinc-400 hover:text-zinc-200 p-1 rounded-sm bg-zinc-500/20"
              onClick={handleEllipsisClick}
            >
              <Ellipsis className="size-4 text-zinc-400 hover:text-zinc-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - now display only */}
      <div className="text-sm pb-4 pt-2 min-h-[3rem] text-zinc-300 whitespace-pre-wrap">
        {data.content || (
          <span className="italic text-zinc-500">
            Double click or click the menu to add content...
          </span>
        )}
      </div>

      <Handle // Manually add handles
        type="target"
        position={Position.Top}
        className="size-1 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />
      <Handle // Manually add handles
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
        minHeight={30}
      />
    </div>
  );
}
