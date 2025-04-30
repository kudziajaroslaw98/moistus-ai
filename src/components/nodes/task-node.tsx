"use client";

import { useCallback, useState, useEffect } from "react";
import BaseEditableNode from "./base-editable-node";
import { supabaseClient } from "@/helpers/supabase/client";
import { NodeData } from "@/types/node-data";
import { Node, useReactFlow, Handle, Position } from "@xyflow/react"; // Import Handle and Position

export default function TaskNode(props: Node<NodeData>) {
  const { id, data } = props;
  const { setNodes } = useReactFlow();
  const supabase = supabaseClient;
  const [isComplete, setIsComplete] = useState(
    Boolean(data.metadata?.isComplete),
  );

  // Sync local state with data prop changes
  useEffect(() => {
    setIsComplete(Boolean(data.metadata?.isComplete));
  }, [data.metadata?.isComplete]);

  const handleCheckboxChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newState = e.target.checked;
      setIsComplete(newState);

      const updatedMetadata = {
        ...(data.metadata || {}),
        isComplete: newState,
      };

      // Optimistically update local state for immediate feedback
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, metadata: updatedMetadata } }
            : n,
        ),
      );

      try {
        const { error } = await supabase
          .from("nodes")
          .update({
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
        // Note: History state update would typically be triggered by the parent
        // component detecting the node data change via setNodes.
      } catch (error) {
        console.error("Error saving task status:", error);
        // Revert local state if save fails
        setIsComplete(!newState);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    metadata: {
                      ...(data.metadata || {}),
                      isComplete: !newState,
                    },
                  },
                }
              : n,
          ),
        );
        // TODO: Show user-facing error notification
      }
    },
    [id, data.metadata, supabase, setNodes],
  );

  return (
    // Apply opacity conditionally to the main container
    <div
      className={`task-node flex items-start gap-2 relative ${isComplete ? "opacity-70" : ""} rounded-sm shadow-md border border-zinc-600 bg-zinc-700 p-3`} // Added styling to the wrapper
    >
      <Handle // Manually add handles as BaseEditableNode handles are hidden
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800"
      />
      {/* Custom styled checkbox */}
      <input
        type="checkbox"
        checked={isComplete}
        onChange={handleCheckboxChange}
        className="nodrag mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-zinc-500 bg-zinc-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-700" // Tailwind styled checkbox, adjusted margin-top
        onClick={(e) => e.stopPropagation()} // Prevent React Flow drag
      />
      {/* Apply line-through to the container of the base node content area */}
      <div className={`flex-grow ${isComplete ? "line-through" : ""}`}>
        {/* BaseEditableNode renders the text content and its own internal styling */}
        {/* Pass only relevant props and hide handles as we add them manually here */}
        <BaseEditableNode
          {...props}
          id={props.id}
          data={props.data}
          selected={props.selected}
          hideHandles={true}
        />
      </div>
      <Handle // Manually add handles as BaseEditableNode handles are hidden
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800"
      />
    </div>
  );
}
