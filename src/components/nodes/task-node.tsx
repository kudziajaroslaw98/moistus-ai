"use client";

import { useCallback } from "react";
import { NodeData } from "@/types/node-data";
import { Node, Handle, Position, NodeResizer } from "@xyflow/react";
import { Ellipsis, CheckSquare } from "lucide-react"; // Import icons
import { cn } from "@/utils/cn";

// Add onEditNode prop to the node props
interface TaskNodeProps extends Node<NodeData> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
}

// Change function signature to accept props
export default function TaskNode(props: TaskNodeProps) {
  const { id, data, selected, onEditNode } = props;

  // Read metadata and style properties from data
  const isComplete = Boolean(data.metadata?.isComplete);

  const handleEllipsisClick = useCallback(() => {
    // Trigger the modal opening via the parent prop
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  // Double click also opens the modal
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
      <Handle
        type="target"
        position={Position.Top}
        className="size-2 rounded-full !border-zinc-800 !bg-zinc-500"
      />
      <div className="relative flex h-10 w-full justify-between rounded-md bg-zinc-900 p-2">
        <div className="z-20 flex items-center justify-center gap-4">
          {/* Icon Area - Customize color */}
          <div className="flex size-6 items-center justify-center rounded-sm bg-green-700">
            <CheckSquare className="size-4 text-zinc-100" /> {/* Task icon */}
          </div>
        </div>

        <div className="z-20 flex items-center justify-center gap-4">
          {/* Checkbox is now part of the modal form, don't render interactable one here */}
          {/* Display the state visually if needed */}
          {isComplete && (
            <span className="text-xs font-medium text-green-400">Done</span>
          )}
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

      {/* Content Area - Apply font size */}
      <div
        className={cn([
          "min-h-[3rem] pt-2 pb-4 whitespace-pre-wrap",
          isComplete && "line-through", // Apply line-through here
        ])}
        // Text color is applied to the main container's style prop
      >
        {data.content || (
          <span className="text-zinc-500 italic">
            Double click or click the menu to add description...
          </span>
        )}
      </div>

      {/* Handles - Adjust positioning if padding changes */}
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
