"use client";

import { saveNodeContent } from "@/helpers/save-node-content";
import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Position, Node, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
// import "react-quill/dist/quill.snow.css"; // Keep for potential future use

export default function BaseEditableNode({
  id,
  data,
  selected,
  hideHandles,
}: Node<NodeData> & { hideHandles?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  // Use local state initialized from data, but treat data as source of truth after save
  const [localContent, setLocalContent] = useState(data?.content || "");
  const reactFlowInstance = useReactFlow();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Determine background, border, and text colors from data or use defaults
  // Use hex or standard color names directly in style prop if Tailwind classes are tricky with dynamic values
  // Or define custom CSS variables linked to Tailwind colors if complex dynamic styles are needed
  const nodeBgColor = data?.backgroundColor || "theme(colors.zinc.700)";
  const nodeBorderColor = data?.borderColor || "theme(colors.zinc.600)";
  const nodeTextColor = data?.color || "theme(colors.zinc.100)";

  const handleDoubleClick = useCallback(() => {
    if (!isEditing) {
      // Only enter editing if not already editing
      setIsEditing(true);
    }
  }, [isEditing]);

  const handleBlur = useCallback(async () => {
    setIsEditing(false);
    // Trim content before comparing and saving
    const trimmedContent = localContent.trim();
    const trimmedOriginalContent = data?.content?.trim() || "";

    // Only save if content has actually changed
    if (trimmedContent !== trimmedOriginalContent) {
      // Update React Flow state immediately with the new content
      reactFlowInstance.setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  content: trimmedContent,
                  label: trimmedContent, // Update label for mini-map/overview
                },
              }
            : node,
        ),
      );
      // Save to database in the background
      await saveNodeContent(id, trimmedContent);
      // History is managed by the hook receiving node changes or save events
    }
    // Note: localContent state is not reset here, it stays as what the user typed until
    // the data prop updates or the component remounts. This is generally fine.
  }, [id, localContent, data?.content, reactFlowInstance]);

  // Sync local content when data prop changes externally (e.g., undo/redo, AI generation, initial load)
  useEffect(() => {
    setLocalContent(data?.content || "");
  }, [data?.content]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
      // Select content only if it's a fresh edit (optional)
      // editorRef.current.select();
    }
  }, [isEditing]);

  // Stop propagation for text area clicks/interactions
  const stopPropagation = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
    },
    [],
  );

  return (
    // Base container for the node, handles border/background/text color based on data
    // Added `nodrag` to the container itself to prevent dragging while interacting inside
    <div
      className={cn(["p-4 rounded-md"])}
      style={{
        backgroundColor: nodeBgColor.startsWith("theme(")
          ? undefined
          : nodeBgColor, // Use style only if not a theme class
        borderColor: nodeBorderColor.startsWith("theme(")
          ? undefined
          : nodeBorderColor,
        color: nodeTextColor.startsWith("theme(") ? undefined : nodeTextColor,
      }}
      onDoubleClick={handleDoubleClick}
      // Prevent dragging when interacting with the node content area (handled by nodrag on input/div)
      // But allow dragging from node edges if needed, React Flow default handles this.
    >
      {/* Simple Handles */}
      {!hideHandles && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800" // Tailwind !important modifiers
            isConnectable={!isEditing} // Prevent connecting while editing
          />
          <Handle
            type="target"
            position={Position.Left}
            className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800" // Tailwind !important modifiers
            isConnectable={!isEditing} // Prevent connecting while editing
          />
          <Handle
            type="target"
            position={Position.Right}
            className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800" // Tailwind !important modifiers
            isConnectable={!isEditing} // Prevent connecting while editing
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-2 !h-2 !bg-zinc-500 !border-zinc-800"
            isConnectable={!isEditing} // Prevent connecting while editing
          />
        </>
      )}

      {isEditing ? (
        <textarea
          ref={editorRef}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={handleBlur}
          className="w-full min-h-[60px] resize-none rounded-sm border border-zinc-500 bg-zinc-600 p-1.5 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          rows={3} // Ensure enough rows are visible by default
          onClick={stopPropagation} // Prevent double click propagation from textarea
          onKeyDown={stopPropagation} // Prevent React Flow shortcuts while typing
        />
      ) : (
        // Render content safely - use prose for potential markdown/html later?
        // min-h-[24px] ensures empty nodes have some height (enough for placeholder)
        <div
          className="min-h-[24px] text-sm break-words cursor-text" // Ensure text breaks, use cursor-text
          dangerouslySetInnerHTML={{
            __html:
              data?.content?.trim() ||
              "<span class='text-zinc-500 italic'>Double click to edit...</span>", // Add placeholder
          }}
          onClick={handleDoubleClick} // Allow single click to start editing on empty node
        />
      )}
    </div>
  );
}
